import { createContext } from "expression-expander";
import { LogLevelMixin } from "loglevel-mixin";
import { ContentEntry } from "content-entry";
import { Branch, PullRequest, Commit } from "repository-provider";
import { Package } from "./mergers/package.mjs";
import { Template } from "./template.mjs";
import { jspath, asArray } from "./util.mjs";

export { Template };

/**
 * Context prepared to execute one branch.
 *
 * @property {Object} ctx
 * @property {Map<string,Object>} files
 */
export class Context extends LogLevelMixin(class _Context {}) {
  static async from(provider, targetBranch, options) {
    const pc = new Context(provider, targetBranch, options);
    return pc.initialize();
  }

  /** @type {Branch|String} */ targetBranch;
  /** @type {String} */ #pullRequestBranch;

  /**
   * Context prepared to execute one branch.
   * @param {Object} provider
   * @param {Branch|string} targetBranch
   * @param {Object} options
   */
  constructor(provider, targetBranch, options = {}) {
    super();

    provider.messageDestination = this;
    this.options = options;
    this.provider = provider;
    this.templateSources = asArray(options.template);
    this.targetBranch = targetBranch;
    this.#pullRequestBranch = options.pullRequestBranch;
    this.track = options.track || false;
    this.dry = options.dry || false;
    this.create = options.create || false;
    this.properties = {
      date: { year: new Date().getFullYear() },
      license: {},
      ...options.properties
    };
    this.ctx = createContext({
      properties: this.properties,
      keepUndefinedValues: true,
      leftMarker: "{{",
      rightMarker: "}}",
      markerRegexp: "{{([^}]+)}}",
      evaluate: (expression, context, path) =>
        jspath(this.properties, expression)
    });

    this.log = options.log || ((level, ...args) => console.log(...args));
  }

  get logLevel() {
    return this.options.logLevel;
  }

  expand(arg, flag = true) {
    return flag ? this.ctx.expand(arg) : arg;
  }

  evaluate(expression) {
    return jspath(this.properties, expression);
  }

  /**
   * 
   * @returns {Promise<Context|undefined>}
   */
  async initialize() {
    let targetBranch = this.targetBranch;

    if (typeof this.targetBranch === "string") {
      targetBranch = await this.provider.branch(this.targetBranch);

      if (targetBranch === undefined) {
        const targetRepository = await this.provider.repository(
          this.targetBranch
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
              `Create new repo: ${this.targetBranch} ${JSON.stringify(
                properties
              )}`
            );

            await this.provider.createRepository(this.targetBranch, properties);
            targetBranch = await this.provider.branch(this.targetBranch);
          }
          if (targetBranch === undefined) {
            throw new Error(`Unable to find branch ${this.targetBranch}`);
          }
        }
      }

      if (!targetBranch.isWritable) {
        return undefined;
      }

      this.targetBranch = targetBranch;
    }

    const repository = targetBranch.repository;

    this.properties.fullName = repository.name;

    this.properties.repository = {
      name: repository.name,
      provider: repository.provider.name,
      fullName: repository.fullName,
      url: repository.cloneURL,
      type: repository.type,
      owner: targetBranch.repository.owner.name
    };

    this.properties[targetBranch.provider.name] = {
      user: targetBranch.repository.owner.name,
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

    if(!this.isTemplate && !this.targetBranch.isWritable) {
      return undefined;
    }

    this.templateSources.push(targetBranch.fullCondensedName);

    const template = await Template.templateFor(this, this.templateSources, {
      logLevel: this.logLevel
    });

    if (template === undefined) {
      throw new Error(
        `Unable to extract template repo url from ${targetBranch.name}`
      );
    }

    Object.assign(this.properties, await template.properties());

    this.debug({
      message: "detected properties",
      properties: this.properties
    });

    this.template = template;

    this.debug({
      message: "initialize",
      branch: targetBranch.fullCondensedName
    });

    return this;
  }

  get isTemplate() {
    return this.properties.usedBy !== undefined;
  }

  get pullRequestBranch() {
    return this.#pullRequestBranch || `template-sync/${template.shortKey}`;
  }
  
  /**
   * Generate Pull Requests.
   * @return {AsyncIterable<PullRequest>}
   */
  async *execute() {
    if (this.isTemplate) {
      for (const r of this.properties.usedBy) {
        try {
          // PASS parent template (only one!)
          const options = { ...this.options };
          if (this.templateSources && options.template === undefined) {
            options.template = [this.templateSources[0]];
          }
          //console.log(this.options, options);
          const context = await Context.from(this.provider, r, options);
          if (context?.isWritable) {
            yield* context.execute();
          }
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
   * @return {AsyncIterable<Commit>}
   */
  async *commits() {
    for (const templateEntry of this.template.entries()) {
      let name = templateEntry.name;
      const merger = templateEntry.merger;
      this.trace({
        message: "merge",
        name,
        merger: merger?.factory.name
      });

      if (merger) {
        name = this.expand(name);

        yield* merger.factory.commits(
          this,
          (await this.targetBranch.maybeEntry(name)) || new ContentEntry(name),
          templateEntry,
          merger.options
        );
      }
    }
  }

  get isWritable() {
    return this.targetBranch.isWritable;
  }

  /**
   * Generate Pull Requests.
   * @return {AsyncIterable<PullRequest>} the actual PRs
   */
  async *executeBranch() {
    try {
      const targetBranch = this.targetBranch;

      if (targetBranch.isWritable) {
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
          pullRequestBranch: this.pullRequestBranch,
          title: `merge from ${this.pullRequestBranch}`,
          bodyFromCommitMessages: true,
          dry: this.dry
        });
      } else {
        this.info({
          message: "is not writable skipping",
          branch: targetBranch.fullCondensedName
        });
      }
    } catch (err) {
      this.error(err);
    }
  }
}
