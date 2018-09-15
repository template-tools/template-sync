import babel from "rollup-plugin-babel";
import resolve from "rollup-plugin-node-resolve";
import multiEntry from "rollup-plugin-multi-entry";
import commonjs from "rollup-plugin-commonjs";
import istanbul from "rollup-plugin-istanbul";
import baseRollup from "../rollup.config.js";

const external = [
  "ava",
  "os",
  "path",
  "crypto",
  "fs",
  "util",
  "url",
  "net",
  "tty",
  "mock-repository-provider",
  "execa",
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
  ...baseRollup,
  {
    input: "tests/**/*-test.js",
    external,
    plugins: [
      babel({
        babelrc: false,
        plugins: ["@babel/plugin-proposal-async-generator-functions"],
        exclude: "node_modules/**"
      }),
      multiEntry(),
      resolve(),
      commonjs(),
      istanbul({
        exclude: ["tests/**/*-test.js", "node_modules/**/*"]
      })
    ],

    output: {
      file: "build/bundle-test.js",
      format: "cjs",
      sourcemap: true,
      interop: false
    }
  }
];
