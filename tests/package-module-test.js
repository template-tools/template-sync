import test from 'ava';
import Package from '../src/package';

test('optional dev modules', t => {
  const pkg = new Package('package.json');
  t.deepEqual(
    pkg.optionalDevModules(new Set(['a', 'cracks', 'dont-crack'])),
    new Set(['cracks', 'dont-crack'])
  );
});

test('optional dev modules empty', t => {
  const pkg = new Package('package.json');
  t.deepEqual(pkg.optionalDevModules(new Set()), new Set());
});
