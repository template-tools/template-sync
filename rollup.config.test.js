/* jslint node: true, esnext: true */
'use strict';

import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';

export default {
  entry: 'src/license.js',
  format: 'cjs',
  dest: 'build/bundle.test.js',
  plugins: [istanbul({
    exclude: ['tests/*.js', 'node_modules/**/*']
  }), nodeResolve({
    jsnext: true
  }), commonjs()]
};
