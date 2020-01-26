import test from "ava";
import { Rollup } from "../src/mergers/rollup.mjs";

test("rollup used dependencies", async t => {
  const rollup = new Rollup("rollup.config.json");

  const modules = rollup.usedDevDependencies(`import babel from 'rollup-plugin-babel';
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
  };`);

  t.deepEqual(
    modules,
    new Set([
      "rollup-plugin-babel",
      "rollup-plugin-multi-entry",
      "@rollup/plugin-node-resolve"
    ])
  );
});

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
