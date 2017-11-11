import { worker } from './worker';

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
        args.repos.map(repo =>
          worker(spinner, pass, repo, options.template, options.dry)
        )
      );
    });
  });

program.parse(process.argv);
