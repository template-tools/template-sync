import Context from './context';
import Travis from './travis';
import Readme from './readme';
import Package from './package';
import Rollup from './rollup';
import License from './license';
import MergeAndRemoveLineSet from './merge-and-remove-line-set';
import JSONFile from './json-file';
import { GithubProvider } from './github-repository-provider';

export async function worker(spinner, token, targetRepo, templateRepo) {
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

    console.log(`branch: ${branch}`);

    const sourceBranch = await repository.branch(branch);

    console.log(`${branch} -> ${sourceBranch.name}`);

    const newBrachName = `template-sync-${maxBranchId + 1}`;

    const context = new Context(repository, undefined, {
      'github.user': user,
      'github.repo': repo,
      name: repo,
      user,
      'date.year': new Date().getFullYear(),
      'license.owner': user
    });

    const pkg = new Package('package.json');

    if (templateRepo === undefined) {
      templateRepo = await pkg.templateRepo(context);

      if (templateRepo === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetRepo} package.json`
        );
      }
    }

    context.templateRepo = await provider.repository(templateRepo);
    const templateBranch = await context.templateRepo.branch('master');
    const templateFiles = new Map(
      (await templateBranch.list()).map(f => [f.path, f])
    );

    const files = [
      new Rollup('rollup.config.js'),
      new Rollup('tests/rollup.config.js'),
      pkg,
      new Readme('doc/README.hbs'),
      new JSONFile('doc/jsdoc.json'),
      new Travis('.travis.yml'),
      new MergeAndRemoveLineSet('.gitignore', 'chore(git)'),
      new MergeAndRemoveLineSet('.npmignore', 'chore(npm)'),
      new License('LICENSE')
    ].filter(f => templateFiles.get(f.path));

    files.forEach(f => context.addFile(f));

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      spinner.succeed(`${targetRepo} nothing changed`);
      return;
    }
    spinner.text = merges.map(m => m.path + ': ' + m.messages[0]).join(',');

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
