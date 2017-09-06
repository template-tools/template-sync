import Context from './context';
import Travis from './travis';
import Readme from './readme';
import Package from './package';
import Rollup from './rollup';
import License from './license';
import MergeAndRemoveLineSet from './merge-and-remove-line-set';
import JSONFile from './json-file';
import { GithubProvider } from './github-repository-provider';

const program = require('caporal'),
  path = require('path'),
  keychain = require('keychain'),
  prompt = require('prompt'),
  ora = require('ora');

const spinner = ora('args').start();

process.on('uncaughtException', err => spinner.fail(err));
process.on('unhandledRejection', reason => spinner.fail(reason));

program
  .description('Keep npm package in sync with its template')
  .version(require(path.join(__dirname, '..', 'package.json')).version)
  .option(
    '-k, --keystore <account/service>',
    'keystore',
    /^[\w\-]+\/.*/,
    'arlac77/GitHub for Mac SSH key passphrase — github.com'
  )
  .option('-s, --save', 'save keystore')
  .option(
    '-t, --template <user/repo>',
    'template repository',
    /^[\w\-]+\/[\w\-]+$/
  )
  .argument('[repos...]', 'repos to merge')
  .action((args, options) => {
    const keystore = {};
    [keystore.account, keystore.service] = options.keystore.split(/\//);

    if (options.save) {
      prompt.start();
      const schema = {
        properties: {
          password: {
            required: true,
            hidden: true
          }
        }
      };
      prompt.get(schema, (err, result) => {
        if (err) {
          spinner.fail(err);
          return;
        }
        keychain.setPassword(
          {
            account: keystore.account,
            service: keystore.service,
            password: result.password
          },
          err => {
            if (err) {
              spinner.fail(err);
              return;
            }
            spinner.succeed('password set');
          }
        );
      });
    }

    keychain.getPassword(keystore, (err, pass) => {
      if (err) {
        spinner.fail(err);
        return;
      }
      Promise.all(
        args.repos.map(repo => work(spinner, pass, repo, options.template))
      );
    });
  });

program.parse(process.argv);

async function work(spinner, token, targetRepo, templateRepo) {
  spinner.text = targetRepo;
  const [user, repo, branch] = targetRepo.split(/[\/#]/);

  try {
    const provider = new GithubProvider(token);

    const repository = await provider.repository(targetRepo);
    const branches = await repository.branches(targetRepo.replace(/#.*/, ''));

    const maxBranchId = Array.from(
      branches.values()
    ).reduce((prev, current) => {
      const m = current.name.match(/template-sync-(\d+)/);
      if (m) {
        const r = parseInt(m[1], 10);
        if (r > prev) {
          return r;
        }
      }

      return prev;
    }, 0);

    const sourceBranch = await repository.branch('master');
    const newBrachName = `template-sync-${maxBranchId + 1}`;

    const context = new Context(repository, undefined, {
      'github.user': user,
      'github.repo': repo,
      name: repo,
      user,
      'date.year': new Date().getFullYear(),
      'license.owner': user
    });

    const files = [
      new Rollup(context, 'rollup.config.js'),
      new Rollup(context, 'tests/rollup.config.js'),
      new Package(context, 'package.json'),
      new Readme(context, 'doc/README.hbs'),
      new JSONFile(context, 'doc/jsdoc.json'),
      new Travis(context, '.travis.yml'),
      new MergeAndRemoveLineSet(context, '.gitignore', 'chore(git)'),
      new MergeAndRemoveLineSet(context, '.npmignore', 'chore(npm)'),
      new License(context, 'LICENSE')
    ];

    if (templateRepo === undefined) {
      templateRepo = await files[2].templateRepo(); // package.json

      if (templateRepo === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetRepo} package.json`
        );
      }
    }

    context.templateRepo = await provider.repository(templateRepo);

    const merges = (await Promise.all(files.map(f => f.merge))).filter(
      m => m !== undefined && m.changed
    );

    if (merges.length === 0) {
      spinner.succeed(`${targetRepo} nothing changed`);
      return;
    }
    spinner.text = merges.map(m => m.path + ': ' + m.messages[0]).join(',');

    const newBranch = await repository.createBranch(newBrachName, sourceBranch);

    /*
    const commits = await merges.map(m =>
      pThrottle(newBranch.commit(m.messages.join('\n'), [m]), 1, 1000)
    );
    await delay(3000);
    */

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await newBranch.commit(messages.join('\n'), merges);

    try {
      const result = await sourceBranch.createPullRequest(newBranch, {
        title: `merge package template from ${context.templateRepo.name}`,
        body: 'Updated standard to latest version'
      });
      spinner.succeed(result.body.html_url);
    } catch (err) {
      spinner.fail(err.res.body.errors);
    }
  } catch (err) {
    spinner.fail(`${user}/${repo}: ${err}`);
  }
}
