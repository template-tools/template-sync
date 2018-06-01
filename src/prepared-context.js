import { createContext } from 'expression-expander';
import { value } from 'jsonpath';

import { Travis } from './travis';
import { Readme } from './readme';
import { Package } from './package';
import { Rollup } from './rollup';
import { License } from './license';
import { MergeAndRemoveLineSet } from './merge-and-remove-line-set';
import { MergeLineSet } from './merge-line-set';
import { ReplaceIfEmpty } from './replace-if-empty';
import { Replace } from './replace';
import { JSONFile } from './json-file';
import { JSDoc } from './jsdoc';
import { Context } from './context';

const mm = require('micromatch');

/**
 * context prepared to execute one package
 */
export class PreparedContext {
  static get mergers() {
    return [
      Rollup,
      Travis,
      Readme,
      Package,
      JSONFile,
      JSDoc,
      Travis,
      MergeAndRemoveLineSet,
      MergeLineSet,
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
          leftMarker: '{{',
          rightMarker: '}}',
          markerRegexp: '{{([^}]+)}}',
          evaluate: (expression, context, path) =>
            value(this.properties, expression)
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

  get logger() {
    return this.context.logger;
  }

  fail(...args) {
    return this.context.fail(...args);
  }

  warn(...args) {
    return this.context.fail(...args);
  }

  async initialize() {
    const context = this.context;

    const targetBranch = await context.provider.branch(this.targetBranchName);

    if (targetBranch.provider.name === 'GithubProvider') {
      this.properties.github = {
        user: targetBranch.repository.owner,
        repo: targetBranch.repository.condensedName
      };
    }

    const pkg = new Package('package.json');

    Object.assign(this.properties, await pkg.properties(targetBranch));

    let templateBranch;

    if (context.templateBranchName === undefined) {
      try {
        templateBranch = await context.provider.branch(
          this.properties.templateRepo
        );
      } catch (e) {}

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    } else {
      templateBranch = await context.provider.branch(this.templateBranchName);
    }

    Object.defineProperties(this, {
      templateBranch: { value: templateBranch },
      targetBranch: { value: targetBranch }
    });
  }

  static async createFiles(branch, mapping = Context.defaultMapping) {
    const files = await branch.list();

    let alreadyPresent = new Set();

    return mapping
      .map(m => {
        const found = mm(
          files.filter(f => f.type === 'blob').map(f => f.path),
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
    this.files.set(file.path, file);
  }

  /**
   * all used dev modules
   * @return {Set<string>}
   */
  async usedDevModules() {
    const usedModuleSets = await Promise.all(
      Array.from(this.files.values()).map(async file => {
        if (file.path === 'package.json') {
          return file.usedDevModules(
            file.targetContent(this, { ignoreMissing: true })
          );
        } else {
          const m = await file.merge(this);
          return file.usedDevModules(m.content);
        }
      })
    );

    return usedModuleSets.reduce(
      (sum, current) => new Set([...sum, ...current]),
      new Set()
    );
  }

  optionalDevModules(modules) {
    return Array.from(this.files.values())
      .map(file => file.optionalDevModules(modules))
      .reduce((sum, current) => new Set([...sum, ...current]), new Set());
  }

  async trackUsedModule() {
    const templateBranch = this.templateBranch;

    let templatePullRequest;
    let newTemplatePullRequest = false;
    let templatePRBranch = await templateBranch.repository.branch(
      'template-add-used-1'
    );

    const pkg = new Package('package.json');

    const templatePackage = await (templatePRBranch
      ? templatePRBranch
      : templateBranch
    ).content(pkg.path, { ignoreMissing: true });

    const templatePackageContent = templatePackage.content;

    const templatePackageJson =
      templatePackageContent === undefined || templatePackageContent === ''
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
          templatePRBranch = await templateBranch.repository.createBranch(
            'template-add-used-1',
            templateBranch
          );
          newTemplatePullRequest = true;
        }

        await templatePRBranch.commit(`fix: add ${name}`, [
          {
            path: 'package.json',
            content: JSON.stringify(templatePackageJson, undefined, 2)
          }
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

  /**
   * @param {String} targetBranchName
   * @return {Promise<PullRequest>}
   */
  async execute() {
    const templateBranch = this.templateBranch;
    const targetBranch = this.targetBranch;

    const {
      templatePackageJson,
      templatePRBranch,
      templatePullRequest
    } = await this.trackUsedModule();

    const files = await PreparedContext.createFiles(
      templateBranch,
      templatePackageJson.template && templatePackageJson.template.files
    );

    files.forEach(f => this.addFile(f));

    const merges = (await Promise.all(
      files.map(async f => f.merge(this))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      //this.spinner.succeed(`${targetBranch.fullCondensedName}: -`);
      return;
    }

    /*this.text = merges
      .map(m => `${targetBranch.fullCondensedName}: ${m.messages[0]}`)
      .join(',');*/

    if (this.dry) {
      //this.spinner.succeed(`${targetBranch.fullCondensedName}: dry run`);
      return;
    }

    let newPullRequestRequired = false;
    const prBranchName = 'template-sync-1';
    let prBranch = (await this.targetBranch.repository.branches()).get(
      prBranchName
    );

    if (prBranch === undefined) {
      newPullRequestRequired = true;
      prBranch = await this.targetBranch.repository.createBranch(
        prBranchName,
        targetBranch
      );
    }

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await prBranch.commit(messages.join('\n'), merges);

    if (newPullRequestRequired) {
      try {
        const pullRequest = await targetBranch.createPullRequest(prBranch, {
          title: `merge package from ${templateBranch.fullCondensedName}`,
          body: merges
            .map(
              m =>
                `${m.path}
---
- ${m.messages.join('\n- ')}
`
            )
            .join('\n')
        });
        /*this.spinner.succeed(
          `${targetBranch.fullCondensedName}: ${pullRequest.name}`
        );*/

        return pullRequest;
      } catch (err) {
        this.spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      /*this.spinner.succeed(
        `${targetBranch.fullCondensedName}: update PR ${pullRequest.name}`
      );*/
      return pullRequest;
    }
  }
}
