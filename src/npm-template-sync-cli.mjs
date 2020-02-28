#!/bin/sh
":"; //# comment; exec /usr/bin/env node --experimental-modules --experimental-json-modules "$0" "$@"

import fs from "fs";
import program from "commander";
import { removeSensibleValues } from "remove-sensible-values";
import { GithubProvider } from "github-repository-provider";
import { LocalProvider } from "local-repository-provider";
import { AggregationProvider } from "aggregation-repository-provider";
import { Context } from "./context.mjs";
import { setProperty, defaultEncodingOptions } from "./util.mjs";
import pkg from "../package.json";

process.on("uncaughtException", e => console.error(e));
process.on("unhandledRejection", reason => console.error(reason));

const properties = {};

program
  .usage("Keep npm package in sync with its template")
  .version(pkg.version)
  .command("[repos...]", "repos to merge")
  .option("--dry", "do not create branch/pull request")
  .option("--trace", "log level trace")
  .option("--debug", "log level debug")
  .option("--track", "track packages in templates package.json")
  .option(
    "-d --define <key=value>",
    "set provider option",
    (value, properties) => setProperty(properties, ...(value.split(/=/))),
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
          templateSources: program.template,
          dry: program.dry,
          track: program.track,
          properties,
          ...logOptions
        });

        await context.initialize();

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
