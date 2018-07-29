import { Context } from './context';
import { PreparedContext } from './prepared-context';

import {
  setPassword,
  getPassword,
  setProperty,
  removeSensibleValues
} from './util';
import { version } from '../package.json';
import { GithubProvider } from 'github-repository-provider';
import { BitbucketProvider } from 'bitbucket-repository-provider';
import { LocalProvider } from 'local-repository-provider';
import { AggregationProvider } from 'aggregation-repository-provider';
import { directory } from 'tempy';

const program = require('caporal'),
  prompt = require('prompt');

process.on('uncaughtException', err => console.error(err));
process.on('unhandledRejection', reason => console.error(reason));

const properties = {};

program
  .description('Keep npm package in sync with its template')
  .version(version)
  .option('--dry', 'do not create branch/pull request', program.BOOL, false)
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
      setProperty(properties, k, v);
    });
  })
  .option('--list-providers', 'list providers with options and exit')
  .option('--list-properties', 'list all properties and exit')
  .option(
    '-t, --template <identifier>',
    'template repository',
    /^([\w\-]+\/[\w\-]+)|((git|ssh|https?):\/\/.*)$/
  )
  .option(
    '--usage',
    'track packages using template in package.json',
    program.BOOL,
    false
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
          logger.error(err);
          return;
        }

        try {
          await setPassword(result.password, options);
        } catch (e) {
          logger.error(err);
          return;
        }
        logger.info('password set');
      });
    }

    try {
      const pass = await getPassword(options);
      const aggregationProvider = new AggregationProvider();

      if (pass !== null && pass !== undefined) {
        if (properties.GithubProvider === undefined) {
          properties.GithubProvider = {};
        }
        properties.GithubProvider.auth = pass;
      }

      [BitbucketProvider, GithubProvider, LocalProvider].forEach(provider => {
        let options = provider.optionsFromEnvironment(process.env);

        if (options !== undefined || properties[provider.name] !== undefined) {
          options = Object.assign({}, options, properties[provider.name]);
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

      const context = new Context(aggregationProvider, {
        templateBranchName: options.template,
        dry: options.dry,
        trackUsedByModule: options.usage,
        logger,
        properties
      });

      if (options.listProperties) {
        logger.info(JSON.stringify(removeSensibleValues(context.properties)));
        return;
      }

      for (const repo of args.repos) {
        await PreparedContext.execute(context, repo);
      }
    } catch (err) {
      logger.error(err);
    }
  });

program.parse(process.argv);
