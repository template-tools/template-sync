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
import { GithubProvider } from 'github-repository-provider';

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
  spinner,
  logger,
  token,
  targetRepo,
  templateRepo,
  dry = false
) {
  spinner.text = targetRepo;
  const [user, repo, branch = 'master'] = targetRepo.split(/[\/#]/);

  let targetBranch;

  try {
    const provider = new GithubProvider({ auth: token });
    const repository = await provider.repository(targetRepo);

    const sourceBranch = await repository.branch(branch);

    const context = new Context(repository, undefined, {
      github: { user, repo },
      npm: { name: repo, fullName: repo },
      name: repo,
      user,
      'date.year': new Date().getFullYear(),
      'license.owner': user
    });

    context.logger = logger;
    context.dry = dry;
    context.spiner = spinner;

    const pkg = new Package('package.json');
    const properties = await pkg.properties(context);

    Object.keys(properties).forEach(
      name => (context.properties[name] = properties[name])
    );

    //console.log(JSON.stringify(context.properties));

    if (templateRepo === undefined) {
      if (properties.templateRepo === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetRepo} ${pkg.path}`
        );
      }
      templateRepo = properties.templateRepo;
    }

    context.templateRepo = await provider.repository(templateRepo);
    const templateBranch = await context.templateRepo.branch('master');

    const json = JSON.parse(
      await pkg.templateContent(context, { ignoreMissing: true })
    );

    const files = await createFiles(
      templateBranch,
      json.template && json.template.files
    );

    files.forEach(f => context.addFile(f));

    context.logger.debug(context.files.values());

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context, spinner))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      spinner.succeed(`${targetRepo}: nothing changed`);
      return;
    }

    spinner.text = merges.map(m => `${targetRepo}: ${m.messages[0]}`).join(',');

    if (dry) {
      spinner.succeed(`${targetRepo}: dry run`);
      return;
    }

    let newPullRequestRequired = false;
    const targetBranchName = `template-sync-1`;
    targetBranch = (await repository.branches()).get(targetBranchName);

    if (targetBranch === undefined) {
      newPullRequestRequired = true;
      targetBranch = await repository.createBranch(
        targetBranchName,
        sourceBranch
      );
    }

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await targetBranch.commit(messages.join('\n'), merges);

    if (newPullRequestRequired) {
      try {
        const pullRequest = await sourceBranch.createPullRequest(targetBranch, {
          title: `merge package template from ${context.templateRepo.name}`,
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
        spinner.succeed(`${targetRepo}: ${pullRequest.name}`);

        return pullRequest;
      } catch (err) {
        spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.constructor.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      spinner.succeed(`${targetRepo}: update PR`);
      return pullRequest;
    }
  } catch (err) {
    spinner.fail(`${user}/${repo}: ${err}`);
    throw err;
  }
}
