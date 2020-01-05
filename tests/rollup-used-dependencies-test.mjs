import test from "ava";
import { Rollup } from "../src/rollup.mjs";

test("rollup used dependencies", async t => {
  const rollup = new Rollup("rollup.config.json");

  const modules = rollup.usedDevDependencies(`import babel from 'rollup-plugin-babel';
  import multiEntry from 'rollup-plugin-multi-entry';

  export default {
    entry: 'tests/**/*-test.js',
    external: ['ava', 'expression-expander'],
    plugins: [
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
    new Set(["rollup-plugin-babel", "rollup-plugin-multi-entry"])
  );
});

test("rollup optional dev modules", t => {
  const file = new Rollup("rollup.config.json");

  t.deepEqual(
    file.optionalDevDependencies(
      new Set(["a", "rollup-plugin-1", "babel-preset-xyz"])
    ),
    new Set(["rollup-plugin-1", "babel-preset-xyz"])
  );
});
