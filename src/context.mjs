import { createContext } from "expression-expander";
import { LogLevelMixin } from "loglevel-mixin";
import { EmptyContentEntry } from "content-entry";
import { Package } from "./mergers/package.mjs";
import { Template } from "./template.mjs";
import { jspath, asArray, log } from "./util.mjs";

export { Template };

/**
 * Context prepared to execute one branch
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
        throw new Error(`Unable to find branch ${this.targetBranchName}`);
      }
    }

    Object.defineProperties(this, {
      targetBranch: { value: targetBranch }
    });

    const repository = targetBranch.repository;

    this.properties.fullName = repository.name;

    this.properties.repository = {
      name: repository.name,
      url: repository.cloneURL,
      type: repository.type,
      owner: targetBranch.owner.name
    };

    if (targetBranch.provider.name === "GithubProvider") {
      this.properties.github = {
        user: targetBranch.owner.name,
        repo: repository.name
      };
    }

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

  async execute() {
    if (this.properties.usedBy !== undefined) {
      const pullRequests = [];

      for (const r of this.properties.usedBy) {
        try {
          const context = await Context.from(this.provider, r, this.options);
          pullRequests.push(...(await context.execute()));
        } catch (e) {
          this.error(e);
        }
      }
      return pullRequests;
    } else {
      return this.executeBranch();
    }
  }

  /**
   * @return {[Promise<PullRequest>]}
   */
  async executeBranch() {
    const targetBranch = this.targetBranch;

    this.debug({
      message: "execute",
      branch: targetBranch.fullCondensedName
    });

    const pullRequests = [];

    const template = this.template;

    if (this.track && !this.dry) {
      pullRequests.push(
        await template.updateUsedBy(targetBranch, this.templateSources)
      );
    }

    const commits = (
      await Promise.all(
        [...template.entries()].map(async templateEntry => {
          let name = templateEntry.name;
          this.trace({
            message: "merge",
            name,
            merger: templateEntry.merger.factory
              ? templateEntry.merger.factory.name
              : "undefined"
          });
          name = this.expand(name);

          return templateEntry.merger.factory.merge(
            this,
            (await targetBranch.maybeEntry(name)) ||
              new EmptyContentEntry(name),
            templateEntry,
            templateEntry.merger.options
          );
        })
      )
    ).filter(c => c !== undefined);

    if (commits.length === 0) {
      this.info("-");
      return pullRequests;
    }

    if (this.dry) {
      this.info(
        `${targetBranch.fullCondensedName}[DRY]: ${commits
          .map(c => `${c.message}`)
          .join(",")}`
      );
      return pullRequests;
    }

    const prBranch = await targetBranch.createBranch(
      `npm-template-sync/${template.key}`
    );

    for (const commit of commits) {
      //this.properties.entry = commit.entry;
      await prBranch.commit(this.expand(commit.message), [commit.entry]);
    }

    try {
      const pullRequest = await prBranch.createPullRequest(targetBranch, {
        title: `merge from ${template.key}`,
        body: commits
          .map(
            c =>
              `${c.entry.name}
---
- ${c.message}
`
          )
          .join("\n")
      });
      this.info(
        `${targetBranch.fullCondensedName}[${
          pullRequest.number
        }]: ${commits.map(c => `${c.message}`).join(",")}`
      );

      pullRequests.push(pullRequest);
    } catch (err) {
      this.error(err);
    }

    return pullRequests;
  }

  log(level, ...args) {
    log(level, ...args);
  }
}
