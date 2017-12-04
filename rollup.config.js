import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import pkg from './package.json';

const external = ['github-repository-provider', 'expression-expander'];

export default [
  {
    output: {
      file: pkg.bin['npm-template-sync'],
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    plugins: [nodeResolve(), commonjs(), json()],
    external,
    input: 'src/npm-template-sync-cli.js'
  },
  {
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    plugins: [],
    external,
    input: pkg.module
  }
];
