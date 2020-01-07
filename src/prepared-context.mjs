import { createContext } from "expression-expander";
import micromatch from "micromatch";
import { LogLevelMixin, makeLogEvent } from "loglevel-mixin";
import { StringContentEntry } from "content-entry";
import { Travis } from "./travis.mjs";
import { Readme } from "./readme.mjs";
import { Package } from "./package.mjs";
import { Rollup } from "./rollup.mjs";
import { License } from "./license.mjs";
import { MergeAndRemoveLineSet } from "./merge-and-remove-line-set.mjs";
import { MergeLineSet } from "./merge-line-set.mjs";
import { NpmIgnore } from "./npm-ignore.mjs";
import { ReplaceIfEmpty } from "./replace-if-empty.mjs";
import { Replace } from "./replace.mjs";
import { TOML } from "./toml.mjs";
import { INI } from "./ini.mjs";
import { YAML } from "./yaml.mjs";
import { JSONFile } from "./json-file.mjs";
import { JSDoc } from "./jsdoc.mjs";
import { Context } from "./context.mjs";
import { jspath, templateFrom } from "./util.mjs";

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
    static get mergers() {
      return [
        TOML,
        INI,
        YAML,
        Rollup,
        Travis,
        Readme,
        Package,
        JSONFile,
        JSDoc,
        Travis,
        MergeAndRemoveLineSet,
        MergeLineSet,
        NpmIgnore,
        License,
        ReplaceIfEmpty,
        Replace
      ];
    }

    static async from(context, targetBranchName) {
      const pc = new PreparedContext(context, targetBranchName);
      await pc.initialize();
      return pc;
    }

    static async execute(context, targetBranchName) {
      const pc = new PreparedContext(context, targetBranchName);
      await pc.initialize();
      return pc.execute();
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

    get mergers() {
      return this.constructor.mergers;
    }

    get provider() {
      return this.context.provider;
    }

    get templateBranchName() {
      return this.context.templateBranchName;
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

      const pkg = new Package("package.json");

      Object.assign(this.properties, await pkg.properties(targetBranch));

      this.debug({
        message: "detected properties",
        properties: this.properties
      });

      if (this.properties.usedBy !== undefined) {
        Object.defineProperties(this, {
          templateBranch: { value: targetBranch }
        });

        return;
      }

      let templateBranch;

      if (context.templateBranchName === undefined) {
        try {
          templateBranch = await context.provider.branch(
            this.properties.templateRepo
          );
        } catch (e) {}

        if (templateBranch === undefined) {
          throw new Error(
            `Unable to extract template repo url from ${targetBranch.name} ${pkg.name}`
          );
        }
      } else {
        templateBranch = await context.provider.branch(this.templateBranchName);
      }

      Object.defineProperties(this, {
        targetBranch: { value: targetBranch },
        templateBranch: { value: templateBranch }
      });

      this.debug({
        message: "initialized for",
        targetBranch,
        templateBranch
      });
    }

    static async createFiles(branch, mapping = Context.defaultMapping) {
      const files = [];
      for await (const entry of branch) {
        files.push(entry);
      }

      let alreadyPresent = new Set();

      return mapping
        .map(m => {
          const found = micromatch(
            files.map(f => f.name),
            m.pattern
          );

          const notAlreadyProcessed = found.filter(f => !alreadyPresent.has(f));

          alreadyPresent = new Set([...Array.from(alreadyPresent), ...found]);

          return notAlreadyProcessed.map(f => {
            const merger =
              this.mergers.find(merger => merger.name === m.merger) ||
              ReplaceIfEmpty;
            return new merger(f, m.options);
          });
        })
        .reduce((last, current) => Array.from([...last, ...current]), []);
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

    async trackUsedModule(targetBranch) {
      const templateBranch = this.templateBranch;

      let templatePullRequest;
      let newTemplatePullRequest = false;
      const templateAddBranchName = "npm-template-trac-usage/1";
      let templatePRBranch = await templateBranch.repository.branch(
        templateAddBranchName
      );

      const pkg = new Package("package.json");

      const templatePackage = await (templatePRBranch
        ? templatePRBranch
        : templateBranch
      ).entry(pkg.name);

      const templatePackageContent = await templatePackage.getString();

      const templatePackageJson =
        templatePackageContent === undefined || templatePackageContent === ""
          ? {}
          : JSON.parse(templatePackageContent);

      if (this.context.trackUsedByModule) {
        const name = targetBranch.fullCondensedName;

        if (templatePackageJson.template === undefined) {
          templatePackageJson.template = {};
        }
        if (!Array.isArray(templatePackageJson.template.usedBy)) {
          templatePackageJson.template.usedBy = [];
        }

        if (!templatePackageJson.template.usedBy.find(n => n === name)) {
          templatePackageJson.template.usedBy.push(name);
          templatePackageJson.template.usedBy = templatePackageJson.template.usedBy.sort();

          if (templatePRBranch === undefined) {
            templatePRBranch = await templateBranch.createBranch(
              templateAddBranchName
            );
            newTemplatePullRequest = true;
          }

          await templatePRBranch.commit(`fix: add ${name}`, [
            new StringContentEntry(
              "package.json",
              JSON.stringify(templatePackageJson, undefined, 2)
            )
          ]);

          if (newTemplatePullRequest) {
            templatePullRequest = await templateBranch.createPullRequest(
              templatePRBranch,
              {
                title: `add ${name}`,
                body: `add tracking info for ${name}`
              }
            );
          }
        }
      }

      return { templatePackageJson, templatePRBranch, templatePullRequest };
    }

    async execute() {
      if (this.properties.usedBy !== undefined) {
        for (const r of this.properties.usedBy) {
          try {
            await PreparedContext.execute(this.context, r);
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
      const templateBranch = this.templateBranch;
      const targetBranch = this.targetBranch;

      this.debug({
        message: "executeSingleRepo",
        templateBranch,
        targetBranch
      });

      let { templatePackageJson } = await this.trackUsedModule(targetBranch);

      /* collect files form template cascade */
      templatePackageJson = await templateFrom(this.provider, templatePackageJson);

      const templateFiles = templatePackageJson.template.files;
    
      const files = await PreparedContext.createFiles(
        templateBranch,
        templateFiles
      );

      const pkg = files.find(f => f.name === 'package.json');
      if(pkg) {
        pkg.template = new StringContentEntry(
          "package.json",
          JSON.stringify(templatePackageJson, undefined, 2)
        );
      }

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
        this.info("dry run");
        return;
      }

      let newPullRequestRequired = false;
      const prBranchName = "npm-template-sync/1";
      let prBranch = await this.targetBranch.repository.branch(prBranchName);

      if (prBranch === undefined) {
        newPullRequestRequired = true;
        prBranch = await this.targetBranch.createBranch(prBranchName);
      }

      const messages = merges.reduce((result, merge) => {
        merge.messages.forEach(m => result.push(m));
        return result;
      }, []);

      await prBranch.commit(
        messages.join("\n"),
        merges.map(m => new StringContentEntry(m.name, m.content))
      );

      if (newPullRequestRequired) {
        try {
          const pullRequest = await targetBranch.createPullRequest(prBranch, {
            title: `merge from ${templateBranch}`,
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
          this.info({ message: "new PR", pr: pullRequest });

          return pullRequest;
        } catch (err) {
          this.error(err);
        }
      } else {
        const pullRequest = new targetBranch.provider.pullRequestClass(
          targetBranch,
          prBranch,
          "old"
        );

        this.info({ message: "update PR", pr: pullRequest });
        return pullRequest;
      }
    }
  }
);
