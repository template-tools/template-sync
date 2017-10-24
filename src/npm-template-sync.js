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
    /\w+(\/\w+)?/,
    'github/GH_TOKEN'
  )
  //  .option('-d, --dry', 'dry run do not change anything')
  .option(
    '-t, --template <user/repo>',
    'template repository',
    /^[\w\-]+\/[\w\-]+$/
  )
  .argument('[repos...]', 'repos to merge')
  .action(async (args, options) => {
    const password = await getPassword(options);

    spinner.start();

    await Promise.all(
      args.repos.map(repo =>
        worker(spinner, password, repo, options.template, options.dry)
      )
    );
  });

program.parse(process.argv);

async function getPassword(options) {
  let [account, service] = options.keystore.split(/\//);

  const password = await keytar.getPassword(account, service);

  //const password = await keytar.findPassword(service);

  if (password !== null) {
    return password;
  }

  return await savePassword(account, service);
}

function savePassword(account, service) {
  const schema = {
    properties: {
      password: {
        required: true,
        hidden: true
      }
    }
  };

  return new Promise((resolve, reject) =>
    prompt.get(schema, (err, result) => {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      keytar.setPassword(account, service, result.password);
      resolve(result.password);
    })
  );
}
