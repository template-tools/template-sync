import test from 'ava';
import Context from '../src/Context';
import Rollup from '../src/Rollup';
import Client from './Client';

test.only('rollup', async t => {
  const context = new Context(
    new Client({
      'rollup.config.json': {
        templateRepo: `import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  output: {
    dest: pkg.main,
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
        targetRepo: `import babel from 'rollup-plugin-babel';
import pkg from './package.json';

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
    `import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default {
  output: {
    dest: pkg.main,
    format: 'cjs'
  },
  plugins: [
    babel({
      babelrc: false,
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ]
};`
  );
});
