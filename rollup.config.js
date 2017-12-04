import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import pkg from './package.json';

const external = ['github-repository-provider'];

export default [
  {
    output: {
      file: pkg.bin['npm-template-sync'],
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    plugins: [nodeResolve(), commonjs(), json()],
    external,
    input: pkg.module
  },
  {
    output: {
      file: pkg.bin['github-webhook'],
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    plugins: [nodeResolve(), commonjs()],
    external,
    input: 'webhook/github-webhook.js'
  }
];
