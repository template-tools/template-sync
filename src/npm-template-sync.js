import { worker } from './worker';

const program = require('caporal'),
  path = require('path'),
  //keychain = require('keychain'),
  keytar = require('keytar'),
  prompt = require('prompt'),
  ora = require('ora'),
  fs = require('fs');

const spinner = ora('args');

process.on('uncaughtException', err => spinner.fail(err));
process.on('unhandledRejection', reason => spinner.fail(reason));

program
  .description('Keep npm package in sync with its template')
  .version(
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')))
      .version
  )
  .option(
    '-k, --keystore <account/service>',
    'keystore',
    /^[\w\-]+\/.*/,
    'arlac77/GitHub for Mac SSH key passphrase — github.com'
  )
  //  .option('-d, --dry', 'dry run do not change anything')
  .option('-s, --save', 'save keystore')
  .option(
    '-t, --template <user/repo>',
    'template repository',
    /^[\w\-]+\/[\w\-]+$/
  )
  .argument('[repos...]', 'repos to merge')
  .action(async (args, options) => {
    const keystore = {};
    [keystore.account, keystore.service] = options.keystore.split(/\//);

    spinner.start();

    const pass = await keytar.findPassword(keystore.service);

    //const pass = await keytar.getPassword(keystore.account, keystore.service);

    await Promise.all(
      args.repos.map(repo =>
        worker(spinner, pass, repo, options.template, options.dry)
      )
    );

    /*
    if (options.save) {
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
*/
  });

program.parse(process.argv);
