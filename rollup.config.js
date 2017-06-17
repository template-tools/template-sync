import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

export default {
  banner: '#!/usr/bin/env node',
  targets: [{
    dest: pkg.bin['npm-template-sync'],
    format: 'cjs'
  }],
  plugins: [nodeResolve(), commonjs()],
  external: []
};
