import cleanup from "rollup-plugin-cleanup";
import resolve from "rollup-plugin-node-resolve";
import nodeResolve from "rollup-plugin-node-resolve";
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
      banner:
        "#!/usr/bin/env -S node --experimental-modules --experimental-worker",
      interop: false
    },
    plugins: [nodeResolve(), commonjs(), json(), cleanup(), executable()],
    external,
    input: "src/npm-template-sync-cli.js"
  },
  {
    output: {
      file: pkg.main,
      format: "cjs",
      interop: false
    },
    plugins: [nodeResolve(), commonjs(), cleanup()],
    external,
    input: pkg.module
  }
];
