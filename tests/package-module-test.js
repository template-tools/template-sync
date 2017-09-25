import test from 'ava';
import Context from '../src/context';
import Package from '../src/package';
import { MockProvider } from './repository-mock';

test('optional dev modules empty', t => {
  const pkg = new Package('package.json');
  t.deepEqual(pkg.optionalDevModules(new Set(['cracks'])), new Set(['cracks']));
});

test('optional dev modules', t => {
  const pkg = new Package('package.json');

  t.deepEqual(
    pkg.optionalDevModules(
      new Set(['a', 'rollup-plugin-1', 'babel-preset-xyz'])
    ),
    new Set(['rollup-plugin-1', 'babel-preset-xyz'])
  );
});
