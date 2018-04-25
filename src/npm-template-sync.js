import { Context } from './context';
import Travis from './travis';
import Readme from './readme';
import Package from './package';
import Rollup from './rollup';
import License from './license';
import MergeAndRemoveLineSet from './merge-and-remove-line-set';
import MergeLineSet from './merge-line-set';
import ReplaceIfEmpty from './replace-if-empty';
import Replace from './replace';
import JSONFile from './json-file';
import JSDoc from './jsdoc';

const mm = require('micromatch');

const mergers = [
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

const defaultMapping = [
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

export async function createFiles(branch, mapping = defaultMapping) {
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
        const merger = mergers.find(merger => merger.name === m.merger);

        return new (merger ? merger : ReplaceIfEmpty)(f, m.options);
      });
    })
    .reduce((last, current) => Array.from([...last, ...current]), []);
}

/**
 * @param {RepositoryProvider} provider
 * @param {Branch} targetBranch
 * @param {Branch} templateBranch
 * @param {Object} options
 * @return {Promise<PullRequest>}
 */
export async function npmTemplateSync(
  provider,
  targetBranch,
  templateBranch,
  options
) {
  options = Object.assign({}, options, {
    logger: console,
    dry: false,
    trackUsedByModule: false
  });

  options.spinner.text = targetBranch.fullCondensedName;
  const condensedName = targetBranch.repository.condensedName;

  try {
    const context = new Context(
      targetBranch,
      undefined,
      {
        github: { user: targetBranch.owner, repo: condensedName },
        npm: { name: condensedName, fullName: condensedName },
        name: condensedName,
        user: targetBranch.owner,
        'date.year': new Date().getFullYear(),
        'license.owner': targetBranch.owner
      },
      options
    );

    const pkg = new Package('package.json');

    Object.assign(context.properties, await pkg.properties(context));

    if (templateBranch === undefined) {
      templateBranch = await provider.branch(context.properties.templateRepo);

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    }

    context.templateBranch = templateBranch;

    context.logger.debug(
      `Using ${templateBranch.provider.name} as template provider`
    );

    const json = JSON.parse(
      await pkg.templateContent(context, { ignoreMissing: true })
    );

    if (options.trackUsedByModule) {
      if (json.template === undefined) {
        json.template = {};
      }
      if (!Array.isArray(json.template.usedBy)) {
        json.template.usedBy = [];
      }

      if (!json.template.usedBy.find(targetBranch.name)) {
        json.template.usedBy.push(targetBranch.name);

        const prBranch = await templateBranch.repository.createBranch(
          'template-add-used-1',
          context.templateBranch
        );
        await prBranch.commit(`fix: add ${targetBranch.name}`, [
          { path: 'package.json', content: JSON.stringify(json, undefined, 2) }
        ]);
      }
    }

    const files = await createFiles(
      context.templateBranch,
      json.template && json.template.files
    );

    files.forEach(f => context.addFile(f));

    context.logger.debug(context.files.values());

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      context.spinner.succeed(
        `${targetBranch.fullCondensedName}: nothing changed`
      );
      return;
    }

    context.spinner.text = merges
      .map(m => `${targetBranch.fullCondensedName}: ${m.messages[0]}`)
      .join(',');

    if (context.dry) {
      context.spinner.succeed(`${targetBranch.fullCondensedName}: dry run`);
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
          title: `merge package template from ${
            context.templateBranch.fullCondensedName
          }`,
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
        context.spinner.succeed(
          `${targetBranch.fullCondensedName}: ${pullRequest.name}`
        );

        return pullRequest;
      } catch (err) {
        context.spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      context.spinner.succeed(`${targetBranch.fullCondensedName}: update PR`);
      return pullRequest;
    }
  } catch (err) {
    options.spinner.fail(`${targetBranch.fullCondensedName}: ${err}`);
    throw err;
  }
}
