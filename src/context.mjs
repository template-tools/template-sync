import { createContext } from "expression-expander";
import { LogLevelMixin } from "loglevel-mixin";
import { Package } from "./mergers/package.mjs";
import { Template } from "./template.mjs";
import { jspath, asArray, log } from "./util.mjs";

export { Template };

/**
 * context prepared to execute one package
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
          templateSources: [],
          ...options.properties
        }
      },
      ctx: {
        value: createContext({
          properties: Object.assign({}, this.properties),
          keepUndefinedValues: true,
          leftMarker: "{{",
          rightMarker: "}}",
          markerRegexp: "{{([^}]+)}}",
          evaluate: (expression, context, path) =>
            jspath(this.properties, expression)
        })
      },
      files: {
        value: new Map()
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
    const targetBranch = await this.provider.branch(this.targetBranchName);

    if (targetBranch === undefined) {
      throw new Error(`Unable to find branch ${this.targetBranchName}`);
    }

    if (targetBranch.provider.name === "GithubProvider") {
      this.properties.github = {
        user: targetBranch.owner.name,
        repo: targetBranch.repository.name
      };
    }

    if (
      targetBranch.repository.owner !== undefined &&
      this.properties.license.owner === undefined
    ) {
      Object.assign(this.properties.license, {
        owner: targetBranch.owner.name
      });
    }

    if (
      targetBranch.repository.description !== undefined &&
      this.properties.description === undefined
    ) {
      this.properties.description = targetBranch.repository.description;
    }

    try {
      const entry = await targetBranch.entry("package.json");
      Object.assign(this.properties, await Package.properties(entry));
    } catch {}

    this.templateSources.push(...this.properties.templateSources);

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
      targetBranch: { value: targetBranch },
      template: { value: template }
    });

    this.debug({
      message: "initialized for",
      targetBranch
    });
  }

  addFile(file) {
    file.logLevel = this.logLevel;
    this.files.set(file.name, file);
  }

  /**
   * all used dev modules
   * @return {Set<string>}
   */
  async usedDevDependencies() {
    const usedModuleSets = await Promise.all(
      Array.from(this.files.values()).map(async file => {
        if (file.name === "package.json") {
          return file.constructor.usedDevDependencies(
            file.targetEntry(this, { ignoreMissing: true })
          );
        } else {
          const m = await file.merge(this);
          return file.constructor.usedDevDependencies(m.content);
        }
      })
    );

    return usedModuleSets.reduce(
      (sum, current) => new Set([...sum, ...current]),
      new Set()
    );
  }

  optionalDevDependencies(dependencies) {
    return Array.from(this.files.values())
      .map(file => file.constructor.optionalDevDependencies(dependencies, {}))
      .reduce((sum, current) => new Set([...sum, ...current]), new Set());
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
      return this.executeSingleRepo();
    }
  }

  /**
   * @return {[Promise<PullRequest>]}
   */
  async executeSingleRepo() {
    const targetBranch = this.targetBranch;

    const pullRequests = [];

    this.debug({
      message: "executeSingleRepo",
      targetBranch
    });

    const template = this.template;

    if (this.track && !this.dry) {
      pullRequests.push(await template.addUsedPackage(targetBranch));
    }

    const mergers = await template.mergers();

    const commits = (
      await Promise.all(
        mergers.map(async ([name, merger, options]) => {
          let targetEntry = await targetBranch.entry(name);
          if (targetEntry === undefined) {
            targetEntry = new EmptyContentEntry(name);
          }

          return merger.merge(
            this,
            targetEntry,
            await template.entry(name),
            options
          );
        })
      )
    ).filter(c => c !== undefined && c.changed);

    if (commits.length === 0) {
      this.info("-");
      return pullRequests;
    }

    this.info(commits.map(c => `${c.message}`).join(","));

    if (this.dry) {
      return pullRequests;
    }

    const prBranch = await targetBranch.createBranch(
      `npm-template-sync/${template.name}`
    );

    for (const commit of commits) {
      await prBranch.commit(commit.message, [commit.entry]);
    }

    try {
      const pullRequest = await targetBranch.createPullRequest(prBranch, {
        title: `merge from ${template.name}`,
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
      this.info({ message: "PR", pr: pullRequest });

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
