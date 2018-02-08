import Context from './context';
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

export async function npmTemplateSync(
  provider,
  targetBranch,
  templateBranch,
  spinner,
  logger,
  dry = false
) {
  spinner.text = targetBranch.fullCondensedName;
  const repoName = targetBranch.repository.name.split(/\//)[1];

  try {
    const context = new Context(targetBranch, undefined, {
      github: { user: targetBranch.owner, repo: repoName },
      npm: { name: repoName, fullName: repoName },
      name: repoName,
      user: targetBranch.owner,
      'date.year': new Date().getFullYear(),
      'license.owner': targetBranch.owner
    });

    context.logger = logger;
    context.dry = dry;
    context.spiner = spinner;

    const pkg = new Package('package.json');
    const properties = await pkg.properties(context);

    Object.assign(context.properties, properties);

    /*
    Object.keys(properties).forEach(
      name => (context.properties[name] = properties[name])
    );*/

    //console.log(JSON.stringify(context.properties));

    if (templateBranch === undefined) {
      templateBranch = await provider.branch(properties.templateRepo);

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    }

    context.templateBranch = templateBranch;

    const json = JSON.parse(
      await pkg.templateContent(context, { ignoreMissing: true })
    );

    const files = await createFiles(
      context.templateBranch,
      json.template && json.template.files
    );

    files.forEach(f => context.addFile(f));

    context.logger.debug(context.files.values());

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context, spinner))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      spinner.succeed(`${targetBranch.fullCondensedName}: nothing changed`);
      return;
    }

    spinner.text = merges
      .map(m => `${targetBranch.fullCondensedName}: ${m.messages[0]}`)
      .join(',');

    if (dry) {
      spinner.succeed(`${targetBranch.fullCondensedName}: dry run`);
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
        spinner.succeed(
          `${targetBranch.fullCondensedName}: ${pullRequest.name}`
        );

        return pullRequest;
      } catch (err) {
        spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      spinner.succeed(`${targetBranch.fullCondensedName}: update PR`);
      return pullRequest;
    }
  } catch (err) {
    spinner.fail(`${targetBranch.fullCondensedName}: ${err}`);
    throw err;
  }
}
