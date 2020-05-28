#!/bin/sh
":"; //# comment; exec /usr/bin/env node "$0" "$@"

import fs, { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import program from "commander";
import { removeSensibleValues } from "remove-sensible-values";
import { GithubProvider } from "github-repository-provider";
import { LocalProvider } from "local-repository-provider";
import { AggregationProvider } from "aggregation-repository-provider";
import { Context } from "./context.mjs";
import { setProperty, defaultEncodingOptions } from "./util.mjs";

const { version, description } = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    defaultEncodingOptions
  )
);

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", reason => console.error(reason));

const properties = {};
let templates = [];

program
  .usage(description)
  .version(version)
  .command("[branches...]", "branches to merge")
  .option("--dry", "do not create branch/pull request")
  .option("--trace", "log level trace")
  .option("--debug", "log level debug")
  .option("--track", "track packages in templates package.json")
  .option(
    "-d, --define <key=value>",
    "set option",
    (value, properties) => setProperty(properties, ...value.split(/=/)),
    properties
  )
  .option("--list-providers", "list providers with options and exit")
  .option(
    "--list-properties",
    "list all properties (if given of the first branch) and exit"
  )
  .option("-t, --template <identifier>", "template repository", value => templates=templates.concat(value))
  .option("-u, --dump-template <directory>", "copy aggregated template entries")
  .action(async (commander, branches) => {
    const logLevel = program.trace ? "trace" : program.debug ? "debug" : "info";

    try {
      const logOptions = {
        logger: (...args) => console.log(...args),
        logLevel
      };

      const provider = AggregationProvider.initialize(
        [GithubProvider, LocalProvider],
        logOptions,
        process.env
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

      if (branches.length === 0 || branches[0] === ".") {
        const pkg = JSON.parse(
          await fs.promises.readFile("package.json", defaultEncodingOptions)
        );
        branches.push(pkg.repository.url);
      }

      for (const branch of branches) {
        const context = new Context(provider, branch, {          
          template: program.template,
          dry: program.dry,
          track: program.track,
          properties,
          ...logOptions
        });

        await context.initialize();

        if (program.dumpTemplate) {
          await context.template.dump(program.dumpTemplate);
          return;
        }

        if (program.listProperties) {
          console.log(
            JSON.stringify(
              removeSensibleValues(context.properties),
              undefined,
              2
            )
          );
          return;
        }

        await context.execute();
      }
    } catch (err) {
      console.error(err);
      process.exit(-1);
    }
  })
  .parse(process.argv);
