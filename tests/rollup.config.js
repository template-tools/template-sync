/* jslint node: true, esnext: true */
'use strict';

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  entry: 'tests/*_test.js',
  format: 'cjs',
  dest: 'build/bundle.test.js',
  plugins: [istanbul({
    exclude: ['tests/*.js', 'node_modules/**/*']
  }), nodeResolve({
    jsnext: true
  }), commonjs(), multiEntry()]
};
