import { createContext } from "expression-expander";
import { LogLevelMixin } from "loglevel-mixin";
import { StringContentEntry } from "content-entry";
import { Package } from "./mergers/package.mjs";
import { Template } from "./template.mjs";
import { jspath, asArray } from "./util.mjs";

export { Template };

/**
 * context prepared to execute one package
 * @param {string} targetBranchName
 *
 * @property {Object} ctx
 * @property {Map<string,Object>} files
 */
export const Context = LogLevelMixin(
  class _Context {
    static async from(provider, targetBranchName, options) {
      const pc = new Context(provider, targetBranchName, options);
      await pc.initialize();
      return pc;
    }

    constructor(provider, targetBranchName, options = {}) {
      Object.defineProperties(this, {
        trackUsedByModule: {
          value: options.trackUsedByModule || false
        },
        dry: {
          value: options.dry || false
        },
        logger: {
          value: options.logger || console
        },
        provider: {
          value: provider
        },
        properties: {
          value: {
            date: { year: new Date().getFullYear() },
            license: {},
            templateSources: asArray(options.templateSources),
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
    }

    log(arg) {
      const prefixKeys = {
        branch: 1,
        severity: "info"
      };
      const valueKeys = {
        message: "v",
        timestamp: "d"
      };

      const prefix = Object.keys(prefixKeys).reduce((a, c) => {
        if (arg[c]) {
          if (prefixKeys[c] !== arg[c]) {
            a.push(arg[c]);
          }
          delete arg[c];
        }
        return a;
      }, []);

      const values = Object.keys(arg).reduce((a, c) => {
        if (arg[c] !== undefined) {
          switch (valueKeys[c]) {
            case "v":
              a.push(arg[c]);
              break;
            case "d":
              break;
            default:
              a.push(`${c}=${JSON.stringify(arg[c])}`);
          }
        }
        return a;
      }, []);

      console.log(`${prefix.join(",")}: ${values.join(" ")}`);
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

      if (targetBranch.repository.owner !== undefined) {
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
        const templateSources = this.properties.templateSources;
        const entry = await targetBranch.entry("package.json");
        Object.assign(this.properties, await Package.properties(entry));

        if (templateSources.length > 0) {
          this.properties.templateSources = templateSources;
        }
      } catch {}

      const template = await Template.templateFor(
        this.provider,
        this.properties.templateSources
      );

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
        .map(file => file.constructor.optionalDevDependencies(dependencies))
        .reduce((sum, current) => new Set([...sum, ...current]), new Set());
    }

    async execute() {
      if (this.properties.usedBy !== undefined) {
        const pullRequests = [];

        for (const r of this.properties.usedBy) {
          try {
            const context = await Context.from(this.provider, r);
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

      if (this.trackUsedByModule && !this.dry) {
        pullRequests.push(await this.template.addUsedPackage(targetBranch));
      }

      const files = await this.template.mergers();

      files.forEach(f => this.addFile(f));

      this.trace(level =>
        files.map(f => {
          return { name: f.name, merger: f.constructor.name };
        })
      );

      const merges = (
        await Promise.all(files.map(async f => f.merge(this)))
      ).filter(m => m !== undefined && m.changed);

      if (merges.length === 0) {
        this.info("-");
        return pullRequests;
      }

      this.info(merges.map(m => `${m.messages[0]}`).join(","));

      if (this.dry) {
        return pullRequests;
      }

      const prBranch = await targetBranch.createBranch(
        `npm-template-sync/${this.template.name}`
      );

      const messages = [];

      for (const m of merges) {
        messages.push(...m.messages);
        await prBranch.commit(m.messages.join("\n"), [
          new StringContentEntry(m.name, m.content)
        ]);
      }

      try {
        const pullRequest = await targetBranch.createPullRequest(prBranch, {
          title: `merge from ${this.template.name}`,
          body: merges
            .map(
              m =>
                `${m.name}
---
- ${m.messages.join("\n- ")}
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
  }
);
