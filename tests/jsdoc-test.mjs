import test from 'ava';
import { JSDoc } from '../src/mergers/jsdoc.mjs';

test('optional dev modules', t => {
  const jsdoc = new JSDoc('jsdoc.json');
  t.deepEqual(
    jsdoc.optionalDevDependencies(new Set(['a', 'babel-preset-latest'])),
    new Set(['babel-preset-latest'])
  );
});

const FILE_CONTENT = `{
  "plugins": [
    "node_modules/jsdoc-babel"
  ],
  "babel": {
    "presets": [
      "es2015",
      "stage-3"
    ]
  }
}`;

test('used dev modules', async t => {
  const jsdoc = new JSDoc('jsdoc.json');
  t.deepEqual(
    await jsdoc.usedDevDependencies(FILE_CONTENT),
    new Set(['babel-preset-es2015', 'babel-preset-stage-3'])
  );
});
