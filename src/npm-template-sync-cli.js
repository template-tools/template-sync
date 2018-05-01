import { Context } from './context';
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

const defines = {};

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
  .option('-d --define <key=value>', 'set provider option', values => {
    if (!Array.isArray(values)) {
      values = [values];
    }

    values.forEach(value => {
      const [k, v] = value.split(/=/);
      setOption(defines, k, v);
    });
  })
  .option('--list-providers', 'list providers with options and exit')
  .option('--list-options', 'list all options and exit')
  .option(
    '-t, --template <identifier>',
    'template repository',
    /^([\w\-]+\/[\w\-]+)|((git|ssh|https?):\/\/.*)$/
  )
  .option(
    '--usage',
    'track packages using template in package.json',
    program.BOOL
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

      if (pass !== null && pass !== undefined) {
        if (defines.GithubProvider === undefined) {
          defines.GithubProvider = {};
        }
        defines.GithubProvider.auth = pass;
      }

      [BitbucketProvider, GithubProvider, LocalProvider].forEach(provider => {
        let options = provider.optionsFromEnvironment(process.env);

        if (options !== undefined || defines[provider.name] !== undefined) {
          options = Object.assign({}, options, defines[provider.name]);
          aggregationProvider.providers.push(new provider(options));
        }
      });

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

      if (options.listOptions) {
        logger.info(JSON.stringify(removeSensibleValues(defines)));
        return;
      }

      spinner.start();

      const templateBranch = options.template
        ? await aggregationProvider.branch(options.template)
        : undefined;

      await queue.addAll(
        args.repos.map(repo => {
          return async () => {
            const context = new Context();

            return context.execute();
            /*
            npmTemplateSync(
              aggregationProvider,
              await aggregationProvider.branch(repo),
              templateBranch,
              {
                logger,
                spinner,
                dry: options.dry,
                trackUsedByModule: options.usage
              },
              defines
            );
            */
          };
        })
      );
    } catch (err) {
      spinner.fail(err);
    }
  });

program.parse(process.argv);

function setOption(dest, attributePath, value) {
  const m = attributePath.match(/^(\w+)\.(.*)/);

  if (m) {
    const key = m[1];
    if (dest[key] === undefined) {
      dest[key] = {};
    }
    setOption(dest[key], m[2], value);
  } else {
    dest[attributePath] = value;
  }
}

function removeSensibleValues(object) {
  if (
    object === undefined ||
    object === null ||
    typeof object === 'string' ||
    object instanceof String
  ) {
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
