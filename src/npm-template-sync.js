import {
  getBranches,
  pull, createBranch, commit
}
from './github';
import Context from './Context';
import Travis from './Travis';
import Readme from './Readme';
import Package from './Package';
import License from './License';
import ReplaceIfEmpty from './ReplaceIfEmpty';
import MergeAndRemoveLineSet from './MergeAndRemoveLineSet';
import JSONFile from './JSONFile';

const program = require('caporal'),
  path = require('path'),
  keychain = require('keychain'),
  prompt = require('prompt'),
  ora = require('ora'),
  github = require('octonode'),
  githubBasic = require('github-basic');

const spinner = ora('args').start();

process.on('uncaughtException', err => spinner.fail(err));
process.on('unhandledRejection', reason => spinner.fail(reason));

program
  .description('Keep npm package in sync with its template')
  .version(require(path.join(__dirname, '..', 'package.json')).version)
  .option('-k, --keystore <account/service>', 'keystore', /^[\w\-]+\/.*/,
    'arlac77/GitHub for Mac SSH key passphrase — github.com')
  .option('-s, --save', 'save keystore')
  .option('-t, --template <user/repo>', 'template repository', /^[\w\-]+\/[\w\-]+$/)
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
        keychain.setPassword({
          account: keystore.account,
          service: keystore.service,
          password: result.password
        }, err => {
          if (err) {
            spinner.fail(err);
            return;
          }
          spinner.succeed('password set');
        });
      });
    }

    keychain.getPassword(keystore, (err, pass) => {
      if (err) {
        spinner.fail(err);
        return;
      }
      Promise.all(args.repos.map(repo => work(spinner, pass, repo, options.template)));
    });
  });

program.parse(process.argv);

async function work(spinner, token, targetRepo, templateRepo) {
  spinner.text = targetRepo;
  const [user, repo, branch] = targetRepo.split(/[\/#]/);

  const dest = {
    user,
    repo,
    branch: 'template-sync'
  };

  try {
    const client = github.client(token);

    const source = {
      user,
      repo,
      branch: branch || 'master'
    };

    const options = {
      auth: {
        type: 'oauth',
        token
      }
    };

    const branches =
      await getBranches(client, targetRepo.replace(/#.*/, ''));

    const maxBranchId = branches.reduce((prev, current) => {
      const m = current.name.match(/template-sync-(\d+)/);
      if (m) {
        const r = parseInt(m[1], 10);
        if (r > prev) {
          return r;
        }
      }

      return prev;
    }, 0);

    dest.branch += `-${maxBranchId + 1}`;

    const context = new Context(client, targetRepo, templateRepo, {
      'github.user': user,
      'github.repo': repo,
      name: repo,
      'date.year': new Date().getFullYear(),
      'license.owner': user
    });

    const files = [
      new ReplaceIfEmpty(context, 'rollup.config.js'),
      new ReplaceIfEmpty(context, 'tests/rollup.config.js'),
      new Package(context, 'package.json'),
      new Readme(context, 'doc/README.hbs'),
      new JSONFile(context, 'doc/jsdoc.json'),
      new Travis(context, '.travis.yml'),
      new MergeAndRemoveLineSet(context, '.gitignore', 'chore(git)'),
      new MergeAndRemoveLineSet(context, '.npmignore', 'chore(npm)'),
      new License(context, 'LICENSE')
    ];

    if (templateRepo === undefined) {
      templateRepo = await files[2].templateRepo();
      if (templateRepo === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetRepo} package.json`);
      }
      context.templateRepo = templateRepo;
    }

    const merges = (await Promise.all(files.map(f => f.merge))).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      spinner.succeed(`${targetRepo} nothing changed`);
      return;
    }
    spinner.text = merges.map(m => m.path + ': ' + m.messages[0]).join(',');

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await createBranch(user, repo, source.branch, dest.branch, options);

    await commit(user, repo, {
      branch: dest.branch,
      message: messages.join('\n'),
      updates: merges.map(merge => {
        return {
          path: merge.path,
          content: merge.content
        };
      })
    }, options);

    const result = await pull(source, dest, {
      title: `merge package template from ${context.templateRepo}`,
      body: 'Updated standard to latest version'
    }, options);

    spinner.succeed(result.body.html_url);
  } catch (e) {
    spinner.fail(`${dest.user}/${dest.repo}: ${e}`);
  }
}
