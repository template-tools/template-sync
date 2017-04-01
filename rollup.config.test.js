/* jslint node: true, esnext: true */

import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  entry: 'tests/**/*_test.js',
  external: ['ava'],
  plugins: [
    babel({
      babelrc: false,
      presets: ['es2015-rollup'],
      exclude: 'node_modules/**'
    }),
    multiEntry()
  ],
  format: 'cjs',
  dest: 'build/test-bundle.js',
  sourceMap: true
};
