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

const PACKAGE_FILE_CONTENT = `{
  "release": {
    "verifyRelease": "cracks"
  }
}`;

test('used dev modules', async t => {
  const pkg = new Package('package.json');
  t.deepEqual(
    await pkg.usedDevModules(PACKAGE_FILE_CONTENT),
    new Set(['cracks'])
  );
});
