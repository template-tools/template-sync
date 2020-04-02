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
import {
  setProperty,
  defaultEncodingOptions,
  dumpTemplateEntries
} from "./util.mjs";

const { version, description } = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
    defaultEncodingOptions
  )
);

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", reason => console.error(reason));

const properties = {};
const templates = [];

program
  .usage(description)
  .version(version)
  .command("[repos...]", "repos to merge")
  .option("--dry", "do not create branch/pull request")
  .option("--trace", "log level trace")
  .option("--debug", "log level debug")
  .option("--track", "track packages in templates package.json")
  .option(
    "-d, --define <key=value>",
    "set provider option",
    (value, properties) => setProperty(properties, ...value.split(/=/)),
    properties
  )
  .option("--list-providers", "list providers with options and exit")
  .option(
    "--list-properties",
    "list all properties (if given of the first repo) and exit"
  )
  .option("-t, --template <identifier>", "template repository", value => {
    templates.push(value);
    return templates;
  })
  .option("-u, --dump-template <directory>", "copy template entries")
  .action(async (commander, repos) => {
    const logLevel = program.trace ? "trace" : program.debug ? "debug" : "info";

    try {
      const logOptions = {
        logger: (...args) => console.log(...args),
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

      if (repos.length === 0 || repos[0] === ".") {
        const pkg = JSON.parse(
          await fs.promises.readFile("package.json", defaultEncodingOptions)
        );
        repos.push(pkg.repository.url);
      }

      for (const repo of repos) {
        const context = new Context(provider, repo, {
          template: program.template,
          dry: program.dry,
          track: program.track,
          properties,
          ...logOptions
        });

        await context.initialize();

        if (program.dumpTemplate) {
          await dumpTemplateEntries(context.template, program.dumpTemplate);
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
