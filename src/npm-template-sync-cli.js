import { npmTemplateSync } from './npm-template-sync';
import { setPassword, getPassword } from './util';
import { version } from '../package.json';
import { GithubProvider } from 'github-repository-provider';
import { BitbucketProvider } from 'bitbucket-repository-provider';
import { LocalProvider } from 'local-repository-provider';
import { AggregationProvider } from 'aggregation-repository-provider';
import { directory } from 'tempy';

const program = require('caporal'),
  prompt = require('prompt'),
  ora = require('ora'),
  PQueue = require('p-queue');

const spinner = ora('args');

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
  .option('--list-providers', 'list providers with options and exit')
  .option(
    '-t, --template <identifier>',
    'template repository',
    /^([\w\-]+\/[\w\-]+)|((git|ssh|https?):\/\/.*)$/
  )
  .option(
    '--concurrency <number>',
    'number of concurrent repository request',
    program.INT,
    1
  )
  .argument('[repos...]', 'repos to merge')
  .action(async (args, options, logger) => {
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
          await setPassword(result.password, options);
        } catch (e) {
          spinner.fail(err);
          return;
        }
        spinner.succeed('password set');
      });
    }

    try {
      const pass = await getPassword(options);
      const queue = new PQueue({ concurrency: options.concurrency });
      const aggregationProvider = new AggregationProvider();

      [BitbucketProvider, GithubProvider].forEach(provider => {
        let options = provider.optionsFromEnvironment(process.env);

        if (provider === GithubProvider && pass !== undefined) {
          options = Object.assign(
            {
              auth: pass
            },
            options
          );
        }

        if (options !== undefined) {
          logger.debug(
            `add ${provider.name} with options ${Object.keys(options)}`
          );
          aggregationProvider.providers.push(new provider(options));
        }
      });

      aggregationProvider.providers.push(
        new LocalProvider({ workspace: directory() })
      );

      if (options.listProviders) {
        logger.info(
          Array.from(
            aggregationProvider.providers.map(
              p =>
                `${p.name}: ${JSON.stringify(removeSensibleValues(p.config))}`
            )
          ).join('\n')
        );

        return;
      }

      spinner.start();

      const templateBranch = options.template
        ? await aggregationProvider.branch(options.template)
        : undefined;

      await queue.addAll(
        args.repos.map(repo => {
          return async () =>
            npmTemplateSync(
              aggregationProvider,
              await aggregationProvider.branch(repo),
              templateBranch,
              spinner,
              logger,
              options.dry
            );
        })
      );
    } catch (err) {
      spinner.fail(err);
    }
  });

program.parse(process.argv);

function removeSensibleValues(object) {
  if (typeof object === 'string' || object instanceof String) {
    return object;
  }

  const result = {};
  for (const key of Object.keys(object)) {
    const value = object[key];

    if (typeof value === 'string' || value instanceof String) {
      if (key.match(/pass|auth|key|user/)) {
        result[key] = '...';
        continue;
      }
    }

    result[key] = removeSensibleValues(value);
  }

  return result;
}
