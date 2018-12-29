import cleanup from "rollup-plugin-cleanup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import pkg from "./package.json";

const external = [
  "os",
  "path",
  "crypto",
  "fs",
  "util",
  "url",
  "net",
  "tty",
  "stream",
  "jsonpath",
  "deep-extend",
  "simple-diff",
  "micromatch",
  "repository-provider",
  "local-repository-provider",
  "aggregation-repository-provider",
  "github-repository-provider",
  "bitbucket-repository-provider",
  "expression-expander",
  "semver",
  "caporal",
  "enquirer"
];

export default [
  {
    output: {
      file: pkg.bin["npm-template-sync"],
      format: "cjs",
      banner:
        '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-worker "$0" "$@"',
      interop: false
    },
    plugins: [
      resolve(),
      commonjs(),
      json({
        include: "package.json",
        preferConst: true,
        compact: true
      }),
      cleanup(),
      executable()
    ],
    external,
    input: "src/npm-template-sync-cli.js"
  },
  {
    output: {
      file: pkg.main,
      format: "cjs",
      interop: false
    },
    plugins: [resolve(), commonjs(), cleanup()],
    external,
    input: pkg.module
  }
];
