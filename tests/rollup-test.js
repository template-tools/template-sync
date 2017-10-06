import test from 'ava';
import Context from '../src/context';
import Rollup from '../src/rollup';
import { MockProvider } from './repository-mock';

test('rollup', async t => {
  const provider = new MockProvider({
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
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const rollup = new Rollup('rollup.config.json');
  const merged = await rollup.merge(context);
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
  const provider = new MockProvider({
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
  });
  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const rollup = new Rollup('rollup.config.json');
  const merged = await rollup.merge(context);
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

test('rollup without imports and complex target expression', async t => {
  const provider = new MockProvider({
    'rollup.config.json': {
      templateRepo: `
export default {
  input: "input.js",
  output: {
    file: "output.js",
    format: 'cjs'
  }
};`,
      targetRepo: `export default ['base'].map(name => {
  return {
    input: 'tests/xx-test.js',
    output: {
      file: 'build/xx-test.js',
      format: 'cjs'
    }
  };`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const rollup = new Rollup('rollup.config.json');
  const merged = await rollup.merge(context);
  t.deepEqual(
    merged.content,
    `export default ['base'].map(name => {
  return {
    input: 'tests/xx-test.js',
    output: {
      file: 'build/xx-test.js',
      format: 'cjs'
    }
  };`
  );
});
