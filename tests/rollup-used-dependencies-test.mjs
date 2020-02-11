import test from "ava";
import { Rollup } from "../src/mergers/rollup.mjs";

async function rudt(t, content, dependencies) {
  const rollup = new Rollup("rollup.config.json");
  const modules = rollup.usedDevDependencies(content);

  t.deepEqual(modules, new Set(dependencies));
}

rudt.title = (providedTitle = "", content, dependencies) =>
  `rollup used dependencies ${providedTitle} ${content} ${dependencies}`.trim();

test(
  rudt,
  `import babel from 'rollup-plugin-babel';
  import multiEntry from 'rollup-plugin-multi-entry';
  import resolve from "@rollup/plugin-node-resolve";

  export default {
    entry: 'tests/**/*-test.js',
    external: ['ava', 'expression-expander'],
    plugins: [
      resolve(),
      babel({
        babelrc: false,
        exclude: 'node_modules/**'
      }),
      multiEntry()
    ],
    format: 'cjs',
    dest: 'build/test-bundle.js',
    sourceMap: true
  };`,
  [
    "rollup-plugin-babel",
    "rollup-plugin-multi-entry",
    "@rollup/plugin-node-resolve"
  ]
);

test(
  rudt,
  `import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import svelte from "rollup-plugin-svelte";
import { terser } from "rollup-plugin-terser";
import dev from "rollup-plugin-dev";
import copy from "rollup-plugin-copy";
import consts from "rollup-plugin-consts";
import { name, description, version, config } from "./package.json";

const dist = "public";
const port = 5000;

export default {
  input: "src/main.mjs",
  output: {
    sourcemap: true,
    format: "esm",
  },
  plugins: [
    consts({
      name,
      version,
      description,
      ...config
    }),
    svelte({
      css: css => {
      }
    }),
    resolve({ browser: true }),
    commonjs(),
    production && terser(),
    dev({
      port,
      dirs: [dist],
      basePath: config.base
    })
  ]
};`,
  [
    "@rollup/plugin-node-resolve",
    "@rollup/plugin-commonjs",
    "rollup-plugin-svelte",
    "rollup-plugin-terser",
    "rollup-plugin-dev",
    "rollup-plugin-copy",
    "rollup-plugin-consts",
    "./package.json"
  ]
);

test("rollup optional dev modules", t => {
  const file = new Rollup("rollup.config.json");

  t.deepEqual(
    file.optionalDevDependencies(
      new Set([
        "a",
        "rollup-plugin-1",
        "babel-preset-xyz",
        "@rollup/plugin-commonjs"
      ])
    ),
    new Set(["rollup-plugin-1", "babel-preset-xyz", "@rollup/plugin-commonjs"])
  );
});
