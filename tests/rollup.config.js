import babel from 'rollup-plugin-babel';
import multiEntry from 'rollup-plugin-multi-entry';

export default {
  input: 'tests/**/*-test.js',
  external: ['ava', 'expression-expander'],

  plugins: [
    babel({
      babelrc: false,
      exclude: 'node_modules/**'
    }),
    multiEntry()
  ],

  output: {
    file: 'build/test-bundle.js',
    format: 'cjs',
    sourcemap: true
  }
};
