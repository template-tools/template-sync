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
import { PreparedContext } from './prepared-context';

/**
 * @param {RepositoryProvider} provider
 * @param {Object} options
 *
 * @property {RepositoryProvider} provider
 * @property {Object} options
 * @property {String} options.templateBranchName
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
      trackUsedByModule: {
        value: options.trackUsedByModule
      },
      dry: {
        value: options.dry
      },
      logger: {
        value: options.logger
      },
      provider: {
        value: provider
      },
      properties: {
        value: options.properties
      },
      templateBranchName: {
        value: options.templateBranchName
      }
    });
  }

  get defaultMapping() {
    return this.constructor.defaultMapping;
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

  /**
   * @param {String} targetBranchName
   * @return {Promise<PullRequest>}
   */
  async execute(targetBranchName) {
    const pc = PreparedContext.from(this, targetBranchName);

    let newTemplatePullRequest = false;
    let templatePRBranch = await templateBranch.repository.branch(
      'template-add-used-1'
    );

    const pkg = new Package('package.json');

    const templatePackageJson = JSON.parse(
      await pkg.content(
        templatePRBranch ? templatePRBranch : templateBranch,
        pkg.path,
        { ignoreMissing: true }
      )
    );

    if (options.trackUsedByModule) {
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
      templateBranch,
      templatePackageJson.template && templatePackageJson.template.files
    );

    files.forEach(f => this.addFile(f));

    this.logger.debug(this.files.values());

    const merges = (await Promise.all(
      files.map(f => f.merge(this, targetBranch, templateBranch))
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
