import { createContext } from "expression-expander";
import { LogLevelMixin, makeLogEvent } from "loglevel-mixin";
import { StringContentEntry } from "content-entry";
import { Package } from "./mergers/package.mjs";
import { Context } from "./context.mjs";
import { Template } from "./template.mjs";
import { jspath } from "./util.mjs";

/**
 * context prepared to execute one package
 * @param {Context} context
 * @param {string} targetBranchName
 *
 * @property {Object} ctx
 * @property {Map<string,Object>} files
 */
export const PreparedContext = LogLevelMixin(
  class _PreparedContext {
    static async from(context, targetBranchName) {
      const pc = new PreparedContext(context, targetBranchName);
      await pc.initialize();
      return pc;
    }

    constructor(context, targetBranchName) {
      Object.defineProperties(this, {
        ctx: {
          value: createContext({
            properties: Object.assign({}, context.properties),
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
        context: { value: context },
        targetBranchName: { value: targetBranchName }
      });
    }

    get dry() {
      return this.context.dry;
    }

    get trackUsedByModule() {
      return this.context.trackUsedByModule;
    }
  
    get provider() {
      return this.context.provider;
    }

    get properties() {
      return this.ctx.properties;
    }

    expand(...args) {
      return this.ctx.expand(...args);
    }

    evaluate(expression) {
      return jspath(this.properties, expression);
    }

    log(level, arg) {
      this.context.log(
        makeLogEvent(level, arg, {
          branch: this.targetBranch
            ? this.targetBranch.fullCondensedName
            : undefined
        })
      );
    }

    async initialize() {
      const context = this.context;
      const targetBranch = await context.provider.branch(this.targetBranchName);

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

        if(templateSources.length > 0) {
          this.properties.templateSources = templateSources;
        }
      } catch {}

      this.debug({
        message: "detected properties",
        properties: this.properties
      });

      const template = await Template.templateFor(
        this.provider,
        this.properties.templateSources
      );

      if (template === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${pkg.name}`
        );
      }

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
            return file.usedDevDependencies(
              file.targetEntry(this, { ignoreMissing: true })
            );
          } else {
            const m = await file.merge(this);
            return file.usedDevDependencies(m.content);
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
        .map(file => file.optionalDevDependencies(dependencies))
        .reduce((sum, current) => new Set([...sum, ...current]), new Set());
    }

    async execute() {
      if (this.properties.usedBy !== undefined) {
        for (const r of this.properties.usedBy) {
          try {
            const pc = await PreparedContext.from(this.context, r);
            await pc.execute();
          } catch (e) {
            this.error(e);
          }
        }
      } else {
        return this.executeSingleRepo();
      }
    }

    /**
     * @return {Promise<PullRequest>}
     */
    async executeSingleRepo() {
      const targetBranch = this.targetBranch;

      this.debug({
        message: "executeSingleRepo",
        targetBranch
      });

      if (this.trackUsedByModule && !this.dry) {
        await this.template.addUsedPackage(targetBranch);
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
        return;
      }

      this.info(merges.map(m => `${m.messages[0]}`).join(","));

      if (this.dry) {
        return;
      }

      const prBranch = await targetBranch.createBranch(
        `npm-template-sync/${this.template.name}`
      );

      const messages = merges.reduce((result, merge) => {
        merge.messages.forEach(m => result.push(m));
        return result;
      }, []);

      await prBranch.commit(
        messages.join("\n"),
        merges.map(m => new StringContentEntry(m.name, m.content))
      );

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

        return pullRequest;
      } catch (err) {
        this.error(err);
      }
    }
  }
);
