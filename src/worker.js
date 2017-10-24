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
import { GithubProvider } from './github-repository-provider';

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

export async function worker(
  spinner,
  token,
  targetRepo,
  templateRepo,
  dry = false
) {
  spinner.text = targetRepo;
  const [user, repo, branch = 'master'] = targetRepo.split(/[\/#]/);

  try {
    const provider = new GithubProvider(token);
    const repository = await provider.repository(targetRepo);

    const maxBranchId = Array.from(
      (await repository.branches()).keys()
    ).reduce((prev, current) => {
      const m = current.match(/template-sync-(\d+)/);
      if (m) {
        const r = parseInt(m[1], 10);
        if (r > prev) {
          return r;
        }
      }

      return prev;
    }, 0);

    const sourceBranch = await repository.branch(branch);
    const newBrachName = `template-sync-${maxBranchId + 1}`;

    const context = new Context(repository, undefined, {
      'github.user': user,
      'github.repo': repo,
      name: repo,
      user,
      'date.year': new Date().getFullYear(),
      'license.owner': user
    });

    context.spiner = spinner;

    const pkg = new Package('package.json');

    if (templateRepo === undefined) {
      templateRepo = await pkg.templateRepo(context);

      if (templateRepo === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetRepo} ${pkg.path}`
        );
      }
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

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context, spinner))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      spinner.succeed(`${targetRepo}: nothing changed`);
      return;
    }

    spinner.text = merges.map(m => `${targetRepo}: ${m.messages[0]}`).join(',');

    if (dry) {
      return;
    }

    const newBranch = await repository.createBranch(newBrachName, sourceBranch);

    /*
    await merges.map(m =>
      newBranch.commit(m.messages.join('\n'), [m], { force: true })
    );
*/

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await newBranch.commit(messages.join('\n'), merges);

    try {
      const result = await sourceBranch.createPullRequest(newBranch, {
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
      spinner.succeed(result.body.html_url);
    } catch (err) {
      spinner.fail(err.res.body.errors);
    }
  } catch (err) {
    spinner.fail(`${user}/${repo}: ${err}`);
    throw err;
  }
}
