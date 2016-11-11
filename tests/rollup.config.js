/* jslint node: true, esnext: true */
'use strict';

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';

export default {
  entry: 'tests/license_test.js',
  format: 'cjs',
  dest: 'build/bundle.test.js',
  plugins: [istanbul({
    exclude: ['node_modules/**/*']
  }), nodeResolve({
    jsnext: true
  }), commonjs()]
};
