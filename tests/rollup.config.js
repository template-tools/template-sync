import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  external: [
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
  ],

  plugins: [
    babel({
      babelrc: false,
      exclude: 'node_modules/**'
    }),
    multiEntry()
  ],

  output: {
    file: 'build/bundle-test.js',
    format: 'cjs',
    sourcemap: true
  }
};
