import { createContext } from "expression-expander";
import { LogLevelMixin } from "loglevel-mixin";
import { EmptyContentEntry } from "content-entry";
import { Package } from "./mergers/package.mjs";
import { Template } from "./template.mjs";
import { jspath, asArray } from "./util.mjs";

export { Template };

/**
 * Context prepared to execute one branch.
 * @param {string} targetBranchName
 *
 * @property {Object} ctx
 * @property {Map<string,Object>} files
 */
export class Context extends LogLevelMixin(class _Context {}) {
  static async from(provider, targetBranchName, options) {
    const pc = new Context(provider, targetBranchName, options);
    await pc.initialize();
    return pc;
  }

  constructor(provider, targetBranchName, options = {}) {
    super();
    Object.defineProperties(this, {
      options: {
        value: options
      },
      templateSources: {
        value: asArray(options.template)
      },
      track: {
        value: options.track || false
      },
      dry: {
        value: options.dry || false
      },
      create: {
        value: options.create || false
      },
      provider: {
        value: provider
      },
      properties: {
        value: {
          date: { year: new Date().getFullYear() },
          license: {},
          ...options.properties
        }
      },
      ctx: {
        value: createContext({
          properties: this.properties,
          keepUndefinedValues: true,
          leftMarker: "{{",
          rightMarker: "}}",
          markerRegexp: "{{([^}]+)}}",
          evaluate: (expression, context, path) =>
            jspath(this.properties, expression)
        })
      },
      targetBranchName: { value: targetBranchName }
    });

    this.logLevel = options.logLevel;
  }

  expand(...args) {
    return this.ctx.expand(...args);
  }

  evaluate(expression) {
    return jspath(this.properties, expression);
  }

  async initialize() {
    let targetBranch = await this.provider.branch(this.targetBranchName);

    if (targetBranch === undefined) {
      const targetRepository = await this.provider.repository(
        this.targetBranchName
      );
      if (targetRepository !== undefined) {
        targetBranch = await targetRepository.createBranch(
          targetRepository.defaultBranchName
        );
      }
      if (targetBranch === undefined) {
        if (this.create) {
          const properties = Object.assign(
            {},
            this.properties,
            this.properties.repository
          );
          this.info(
            `Create new repo: ${this.targetBranchName} ${JSON.stringify(
              properties
            )}`
          );

          await this.provider.createRepository(
            this.targetBranchName,
            properties
          );
          targetBranch = await this.provider.branch(this.targetBranchName);
        }
        if (targetBranch === undefined) {
          throw new Error(`Unable to find branch ${this.targetBranchName}`);
        }
      }
    }

    Object.defineProperties(this, {
      targetBranch: { value: targetBranch }
    });

    const repository = targetBranch.repository;

    this.properties.fullName = repository.name;

    this.properties.repository = {
      name: repository.name,
      provider: repository.provider.name,
      fullName: repository.fullName,
      url: repository.cloneURL,
      type: repository.type,
      owner: targetBranch.owner.name
    };

    this.properties[targetBranch.provider.name] = {
      user: targetBranch.owner.name,
      repo: repository.name
    };

    if (
      repository.owner !== undefined &&
      this.properties.license.owner === undefined
    ) {
      Object.assign(this.properties.license, {
        owner: targetBranch.owner.name
      });
    }

    if (
      repository.description !== undefined &&
      this.properties.description === undefined
    ) {
      this.properties.description = repository.description;
    }

    try {
      const entry = await targetBranch.entry("package.json");
      Object.assign(this.properties, await Package.properties(entry));
    } catch {}

    this.templateSources.push(targetBranch.fullCondensedName);

    const template = await Template.templateFor(this, this.templateSources, {
      logLevel: this.logLevel
    });

    if (template === undefined) {
      throw new Error(
        `Unable to extract template repo url from ${targetBranch.name} ${pkg.name}`
      );
    }

    Object.assign(this.properties, await template.properties());

    this.debug({
      message: "detected properties",
      properties: this.properties
    });

    Object.defineProperties(this, {
      template: { value: template }
    });

    this.debug({
      message: "initialize",
      branch: targetBranch.fullCondensedName
    });
  }

  /**
   * Generate Pull Requests.
   * @return {AsyncIterator <PullRequest>}
   */
  async *execute() {
    if (this.properties.usedBy !== undefined) {
      for (const r of this.properties.usedBy) {
        try {
          // PASS parent template (only one!)
          const options = { ...this.options };
          if (this.templateSources && options.template === undefined) {
            options.template = [this.templateSources[0]];
          }
          //console.log(this.options, options);
          const context = await Context.from(this.provider, r, options);
          yield* context.execute();
        } catch (e) {
          this.error(e);
        }
      }
    } else {
      yield* this.executeBranch();
    }
  }

  /**
   * Generate all commits from the template entry merges.
   * @return {Commit<AsyncIterator>}
   */
  async *commits() {
    for (const templateEntry of this.template.entries()) {
      let name = templateEntry.name;
      const merger = templateEntry.merger;
      this.trace({
        message: "merge",
        name,
        merger: merger && merger.factory ? merger.factory.name : "undefined"
      });

      if (merger) {
        name = this.expand(name);

        yield* merger.factory.commits(
          this,
          (await this.targetBranch.maybeEntry(name)) ||
            new EmptyContentEntry(name),
          templateEntry,
          merger.options
        );
      }
    }
  }

  /**
   * Generate Pull Requests.
   * @return {AsyncIterator <PullRequest>} the actual PRs
   */
  async *executeBranch() {
    try {
      const targetBranch = this.targetBranch;

      this.debug({
        message: "execute",
        branch: targetBranch.fullCondensedName
      });

      const template = this.template;

      if (this.track) {
        yield* template.updateUsedBy(targetBranch, this.templateSources, {
          dry: this.dry
        });
      }

      yield targetBranch.commitIntoPullRequest(this.commits(), {
        pullRequestBranch: `template-sync/${template.key}`,
        title: `merge from ${template.key}`,
        bodyFromCommitMessages: true,
        dry: this.dry
      });
    } catch (err) {
      this.error(err);
    }
  }

  log(level, ...args) {
    console.log(...args);
  }
}
