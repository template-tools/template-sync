import test from 'ava';
import { MockProvider } from 'mock-repository-provider';

import { Context } from '../src/context.mjs';
import { PreparedContext } from '../src/prepared-context.mjs';
import { Rollup } from '../src/mergers/rollup.mjs';

test('rollup', async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        'rollup.config.json': `import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  input: pkg.module,
  output: {
    file: pkg.main,
    format: 'cjs',
    interop: false
  },
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ]
};`
      }
    },
    targetRepo: {
      master: {
        'rollup.config.json': `'use strict';
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
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templates: ["templateRepo"]
    }),
    'targetRepo'
  );

  const rollup = new Rollup('rollup.config.json');
  const merged = await rollup.merge(context);
  t.is(
    merged.content,
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

test('rollup empty template', async t => {
  const provider = new MockProvider({
    templateRepo: { master: { 'rollup.config.json': '' } },
    targetRepo: {
      master: {
        'rollup.config.json': `import pkg from './package.json';
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
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templates: ["templateRepo"]
    }),
    'targetRepo'
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
    templateRepo: {
      master: {
        'rollup.config.json': `
export default {
  input: "input.js",
  output: {
    file: "output.js",
    format: 'cjs'
  }
};`
      }
    },
    targetRepo: {
      master: {
        'rollup.config.json': `export default ['base'].map(name => {
  return {
    input: 'tests/xx-test.js',
    output: {
      file: 'build/xx-test.js',
      format: 'cjs'
    }
  };`
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templates: ["templateRepo"]
    }),
    'targetRepo'
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
