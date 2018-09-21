import cleanup from "rollup-plugin-cleanup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";
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
  "jsonpath",
  "deep-extend",
  "simple-diff",
  "micromatch",
  "local-repository-provider",
  "aggregation-repository-provider",
  "github-repository-provider",
  "bitbucket-repository-provider",
  "expression-expander"
];

export default [
  {
    output: {
      file: pkg.bin["npm-template-sync"],
      format: "cjs",
      banner: "#!/usr/bin/env node",
      interop: false
    },
    plugins: [
      babel({
        runtimeHelpers: false,
        externalHelpers: true,
        babelrc: false,
        plugins: ["@babel/plugin-proposal-async-generator-functions"],
        exclude: "node_modules/**"
      }),
      resolve(),
      commonjs(),
      json(),
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
    plugins: [
      babel({
        runtimeHelpers: false,
        externalHelpers: true,
        babelrc: false,
        plugins: ["@babel/plugin-proposal-async-generator-functions"],
        exclude: "node_modules/**"
      }),
      resolve(),
      commonjs(),
      cleanup()
    ],
    external,
    input: pkg.module
  }
];
