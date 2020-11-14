import test from "ava";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { Rollup } from "../src/mergers/rollup.mjs";

test("rollup", async t => {
  const commit = await asyncIterator2scalar(
    Rollup.commits(
      await createContext(),
      new StringContentEntry(
        "rollup.config.js",
        `'use strict';
  import babel from 'rollup-plugin-babel';
  export default {
    banner: '#!/usr/bin/env node',
    plugins: [
      babel({
        babelrc: false,
        presets: ['stage-3'],
        exclude: 'node_modules/**'
      })
    ],
    targets: [{
      dest: pkg.bin['a-cmd'],
      format: 'cjs'
    }],
    format: 'cjs',
    external: ['url-resolver-fs'],
    sourceMap: true,
    dest: 'build/test-bundle.js'
  };`
      ),
      new StringContentEntry(
        "rollup.config.js",
        `import babel from 'rollup-plugin-babel';
  import pkg from './package.json';
  
  export default {
    input: pkg.module,
    output: {
      file: pkg.main,
      format: 'cjs',
      interop: false
    },
    plugins: [
      ,
      babel({
        babelrc: false,
        presets: ['stage-3'],
        exclude: 'node_modules/**'
      })
    ]
  };`
      )
    )
  );

  t.is(
    await commit.entries[0].getString(),
    `'use strict';;
import pkg from './package.json';

import babel from 'rollup-plugin-babel';
export default {
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ],

  output: {
    file: pkg.bin['a-cmd'],
    format: 'cjs',
    interop: false,
    banner: '#!/usr/bin/env node'
  },

  external: ['url-resolver-fs'],
  input: pkg.module
};`
  );
});

test("rollup empty template", async t => {
  const commit = await asyncIterator2scalar(
    Rollup.commits(
      await createContext(),
      new StringContentEntry("rollup.config.mjs", "export default {};"),
      new EmptyContentEntry("rollup.config.mjs")
    )
  );

  t.is(commit, undefined);
});

test("rollup empty target", async t => {
  const commit = await asyncIterator2scalar(
    Rollup.commits(
      await createContext(),
      new EmptyContentEntry("rollup.config.mjs"),
      new StringContentEntry("rollup.config.mjs", "export default {};")
    )
  );

  t.is(await commit.entries[0].getString(), `export default {};`);
  t.is(
    await commit.message,
    `chore(rollup): add missing rollup.config.mjs from template`
  );
});

test("rollup without imports and complex target expression", async t => {
  const commit = await asyncIterator2scalar(
    Rollup.commits(
      await createContext(),
      new StringContentEntry(
        "rollup.config.js",
        `export default ['base'].map(name => {
  return {
    input: 'tests/xx-test.js',
    output: {
      file: 'build/xx-test.js',
      format: 'cjs'
    }
  };
});`
      ),
      new StringContentEntry(
        "rollup.config.js",
        `export default {
  input: "input.js",
    output: {
      file: "output.js",
      format: 'cjs'
    }
};`
      )
    )
  );

  t.is(commit, undefined);
});
