import { version, engines } from "../package.json";
import { readFileSync } from "fs";
import { satisfies } from "semver";
import program from "commander";
import { removeSensibleValues } from "remove-sensible-values";
import { GithubProvider } from "github-repository-provider";
import { LocalProvider } from "local-repository-provider";
import { AggregationProvider } from "aggregation-repository-provider";
import { Context } from "./context.mjs";
import { PreparedContext } from "./prepared-context.mjs";
import { setProperty, defaultEncodingOptions } from "./util.mjs";

if (!satisfies(process.versions.node, engines.node)) {
  console.error(
    `require node ${engines.node} (running with ${process.versions.node})`
  );
  process.exit(-1);
}

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", reason => console.error(reason));

const properties = {};

program
  .usage("Keep npm package in sync with its template")
  .version(version)
  .command("[repos...]", "repos to merge")
  .option("--dry", "do not create branch/pull request")
  .option("--debug", "log level debug")
  .option("--track", "track packages in templates package.json")
  .option(
    "-d --define <key=value>",
    "set provider option",
    (value, properties) => {
      const [k, v] = value.split(/=/);
      setProperty(properties, k, v);
    },
    properties
  )
  .option("--list-providers", "list providers with options and exit")
  .option(
    "--list-properties",
    "list all properties (if given of the first repo) and exit"
  )
  .option(
    "-t, --template <identifier>",
    "template repository",
    /^([\w\-]+\/[\w\-]+)|((git|ssh|https?):\/\/.*)$/
  )
  .action(async (commander,repos) => {
    const logLevel = program.debug ? "debug" : "info";

    try {
      const logOptions = {
        logger: (...args) => {
          console.log(...args);
        },
        logLevel
      };

      const provider = new AggregationProvider(
        [GithubProvider, LocalProvider].map(provider =>
          provider.initialize(
            {
              ...logOptions,
              ...properties[provider.name]
            },
            process.env
          )
        ),
        logOptions
      );

      if (program.listProviders) {
        console.log(
          Array.from(
            provider.providers.map(
              p => `${p.name}: ${JSON.stringify(removeSensibleValues(p))}`
            )
          ).join("\n")
        );

        return;
      }

      const context = new Context(provider, {
        templateBranchName: program.template,
        dry: program.dry,
        trackUsedByModule: program.track,
        console,
        properties
      });

      if (repos.length === 0 && program.listProperties) {
        console.log(
          JSON.stringify(removeSensibleValues(context.properties), undefined, 2)
        );
        return;
      }

      if (repos.length === 0 || repos[0] === ".") {
        const pkg = JSON.parse(
          readFileSync("package.json", defaultEncodingOptions)
        );
        repos.push(pkg.repository.url);
      }

      for (const repo of repos) {
        const pc = new PreparedContext(context, repo);
        pc.logLevel = logLevel;
        await pc.initialize();

        if (program.listProperties) {
          console.log(
            JSON.stringify(removeSensibleValues(pc.properties), undefined, 2)
          );
          return;
        }

        await pc.execute();
      }
    } catch (err) {
      console.error(err);
      process.exit(-1);
    }
  })
  .parse(process.argv);
