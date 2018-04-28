import multiEntry from 'rollup-plugin-multi-entry';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import executable from 'rollup-plugin-executable';
import json from 'rollup-plugin-json';
import pkg from '../package.json';

const external = [
  'ava',
  'mock-repository-provider',
  'execa',
  'os',
  'path',
  'crypto',
  'fs',
  'jsonpath',
  'local-repository-provider',
  'aggregation-repository-provider',
  'github-repository-provider',
  'bitbucket-repository-provider',
  'expression-expander'
];

export default [
  {
    output: {
      file: pkg.bin['npm-template-sync'],
      format: 'cjs',
      banner: '#!/usr/bin/env node'
    },
    plugins: [nodeResolve(), commonjs(), json(), executable()],
    external,
    input: 'src/npm-template-sync-cli.js'
  },
  {
    input: 'tests/**/*-test.js',
    external,
    plugins: [multiEntry()],

    output: {
      file: 'build/bundle-test.js',
      format: 'cjs',
      sourcemap: true
    }
  }
];
