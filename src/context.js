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

const mm = require('micromatch');

/**
 * @param {RepositoryProvider} provider
 * @param {Object} options
 *
 * @property {RepositoryProvider} provider
 * @property {Object} options
 */
export class Context {
  static get merges() {
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

  static get defaultMapping() {
    return [
      { merger: 'Package', pattern: '**/package.json' },
      { merger: 'Travis', pattern: '.travis.yml' },
      { merger: 'Readme', pattern: '**/README.*' },
      { merger: 'JSDoc', pattern: '**/jsdoc.json' },
      { merger: 'Rollup', pattern: '**/rollup.config.js' },
      { merger: 'License', pattern: 'LICENSE' },
      {
        merger: 'MergeAndRemoveLineSet',
        pattern: '.gitignore',
        options: { message: 'chore(git): update {{path}} from template' }
      },
      {
        merger: 'MergeAndRemoveLineSet',
        pattern: '.npmignore',
        options: { message: 'chore(npm): update {{path}} from template' }
      },
      { merger: 'ReplaceIfEmpty', pattern: '**/*' }
    ];
  }

  constructor(provider, options) {
    options = Object.assign(
      {},
      {
        logger: console,
        dry: false,
        trackUsedByModule: false
      },
      options
    );

    options.properties = Object.assign(
      {
        'date.year': new Date().getFullYear()
      },
      options.properties
    );

    Object.defineProperties(this, {
      ctx: {
        value: createContext({
          properties: options.properties,
          keepUndefinedValues: true,
          leftMarker: '{{',
          rightMarker: '}}',
          markerRegexp: '{{([^}]+)}}',
          evaluate: (expression, context, path) => value(properties, expression)
        })
      },
      trackUsedByModule: {
        value: options.trackUsedByModule
      },
      dry: {
        value: options.dry
      },
      logger: {
        value: options.logger
      },
      files: {
        value: new Map()
      },
      provider: {
        value: provider
      }
    });
  }

  get properties() {
    return this.ctx.properties;
  }

  get defaultMapping() {
    return this.constructor.defaultMapping;
  }

  async createFiles(branch, mapping = this.defaultMapping) {
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
            mergers.find(merger => merger.name === m.merger) || ReplaceIfEmpty;
          return new merger(f, m.options);
        });
      })
      .reduce((last, current) => Array.from([...last, ...current]), []);
  }

  expand(...args) {
    return this.ctx.expand(...args);
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
            file.originalContent(this, { ignoreMissing: true })
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

  set text(value) {
    if (this.spinner === undefined) {
      console.log(value);
    } else {
      this.spinner.text = value;
    }
  }

  succeed(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.succeed(...args);
    }
  }

  warn(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.warn(...args);
    }
  }

  fail(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.fail(...args);
    }
  }

  async prepareExecute(targetBranchName) {}

  /**
   * @param {String} targetBranchName
   * @return {Promise<PullRequest>}
   */
  async execute(targetBranchName) {
    //const condensedName = targetBranch.repository.condensedName;

    const pkg = new Package('package.json');

    Object.assign(this.properties, await pkg.properties(this));

    if (templateBranch === undefined) {
      try {
        templateBranch = await this.provider.branch(
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
    }

    this.templateBranch = templateBranch;

    this.logger.debug(
      `Using ${templateBranch.provider.name} as template provider`
    );

    let newTemplatePullRequest = false;
    let templatePRBranch = await templateBranch.repository.branch(
      'template-add-used-1'
    );

    const json = JSON.parse(
      await pkg.content(
        templatePRBranch ? templatePRBranch : this.templateBranch,
        pkg.path,
        { ignoreMissing: true }
      )
    );

    if (options.trackUsedByModule) {
      const name = targetBranch.fullCondensedName;

      if (json.template === undefined) {
        json.template = {};
      }
      if (!Array.isArray(json.template.usedBy)) {
        json.template.usedBy = [];
      }

      if (!json.template.usedBy.find(n => n === name)) {
        json.template.usedBy.push(name);
        json.template.usedBy = json.template.usedBy.sort();

        if (templatePRBranch === undefined) {
          templatePRBranch = await templateBranch.repository.createBranch(
            'template-add-used-1',
            this.templateBranch
          );
          newTemplatePullRequest = true;
        }

        await templatePRBranch.commit(`fix: add ${name}`, [
          {
            path: 'package.json',
            content: JSON.stringify(json, undefined, 2)
          }
        ]);

        if (newTemplatePullRequest) {
          const pullRequest = await templateBranch.createPullRequest(
            templatePRBranch,
            {
              title: `add ${name}`,
              body: `add tracking info for ${name}`
            }
          );
        }
      }
    }

    const files = await this.createFiles(
      this.templateBranch,
      json.template && json.template.files
    );

    files.forEach(f => this.addFile(f));

    this.logger.debug(this.files.values());

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(this))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      this.spinner.succeed(
        `${targetBranch.fullCondensedName}: nothing changed`
      );
      return;
    }

    this.spinner.text = merges
      .map(m => `${targetBranch.fullCondensedName}: ${m.messages[0]}`)
      .join(',');

    if (this.dry) {
      this.spinner.succeed(`${targetBranch.fullCondensedName}: dry run`);
      return;
    }

    let newPullRequestRequired = false;
    const prBranchName = 'template-sync-1';
    let prBranch = (await targetBranch.repository.branches()).get(prBranchName);

    if (prBranch === undefined) {
      newPullRequestRequired = true;
      prBranch = await targetBranch.repository.createBranch(
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
          title: `merge package from ${this.templateBranch.fullCondensedName}`,
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
        this.spinner.succeed(
          `${targetBranch.fullCondensedName}: ${pullRequest.name}`
        );

        return pullRequest;
      } catch (err) {
        this.spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      this.spinner.succeed(
        `${targetBranch.fullCondensedName}: update PR ${pullRequest.name}`
      );
      return pullRequest;
    }
  }
}
