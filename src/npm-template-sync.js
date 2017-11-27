import { worker } from './worker';
import { setPassword, getPassword } from './util';
import { version } from '../package.json';

const program = require('caporal'),
  path = require('path'),
  prompt = require('prompt'),
  ora = require('ora'),
  PQueue = require('p-queue');

const spinner = ora('args').start();

process.on('uncaughtException', err => spinner.fail(err));
process.on('unhandledRejection', reason => spinner.fail(reason));

program
  .description('Keep npm package in sync with its template')
  .version(version)
  .option('--dry', 'do not create branch/pull request', program.BOOL)
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
  .action(async (args, options, logger) => {
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
      prompt.get(schema, async (err, result) => {
        if (err) {
          spinner.fail(err);
          return;
        }

        try {
          await setPassword({
            account: keystore.account,
            service: keystore.service,
            password: result.password
          });
        } catch (e) {
          spinner.fail(err);
          return;
        }
        spinner.succeed('password set');
      });
    }

    try {
      const pass = await getPassword(keystore);

      const queue = new PQueue({ concurrency: 1 });

      await queue.addAll(
        args.repos.map(repo => {
          return () =>
            worker(spinner, logger, pass, repo, options.template, options.dry);
        })
      );
    } catch (err) {
      spinner.fail(err);
    }
  });

program.parse(process.argv);
