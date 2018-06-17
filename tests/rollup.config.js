import multiEntry from 'rollup-plugin-multi-entry';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import executable from 'rollup-plugin-executable';
import json from 'rollup-plugin-json';
import pkg from '../package.json';
import baseRollup from '../rollup.config.js';

const external = [
  'ava',
  'mock-repository-provider',
  'execa',
  'os',
  'path',
  'crypto',
  'fs',
  'jsonpath',
  'deep-extend',
  'local-repository-provider',
  'aggregation-repository-provider',
  'github-repository-provider',
  'bitbucket-repository-provider',
  'expression-expander'
];

export default [
  ...baseRollup,
  {
    input: 'tests/**/*-test.js',
    external,
    plugins: [multiEntry()],

    output: {
      file: 'build/bundle-test.js',
      format: 'cjs',
      sourcemap: true,
      interop: false
    }
  }
];
