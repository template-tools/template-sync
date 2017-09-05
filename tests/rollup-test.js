import test from 'ava';
import Context from '../src/context';
import Rollup from '../src/rollup';
import { MockProvider } from './repository-mock';

test('rollup', async t => {
  const context = new Context(
    new MockProvider({
      'rollup.config.json': {
        templateRepo: `import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  input: pkg.module,
  output: {
    file: pkg.main,
    format: 'cjs'
  },
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ]
};`,
        targetRepo: `'use strict';
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
      }
    }),
    'targetRepo',
    'templateRepo',
    {}
  );

  const rollup = new Rollup(context, 'rollup.config.json');
  const merged = await rollup.merge;
  t.deepEqual(
    merged.content,
    `import pkg from './package.json';

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
    banner: '#!/usr/bin/env node'
  },

  external: ['url-resolver-fs'],
  input: pkg.module
};`
  );
});

test('rollup empty template', async t => {
  const context = new Context(
    new MockProvider({
      'rollup.config.json': {
        templateRepo: '',
        targetRepo: `import pkg from './package.json';
import babel from 'rollup-plugin-babel';

export default {
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ],
  targets: [{
    dest: pkg.main,
    format: 'cjs'
  }],
  external: ['url-resolver-fs']
};`
      }
    }),
    'targetRepo',
    'templateRepo',
    {}
  );

  const rollup = new Rollup(context, 'rollup.config.json');
  const merged = await rollup.merge;
  t.deepEqual(
    merged.content,
    `import pkg from './package.json';
import babel from 'rollup-plugin-babel';

export default {
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ],
  targets: [{
    dest: pkg.main,
    format: 'cjs'
  }],
  external: ['url-resolver-fs']
};`
  );
});
