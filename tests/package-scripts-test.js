import test from 'ava';
import Package from '../src/package';

test('decode scripts', t => {
  const d = Package.decodeScripts({
    a: 'xx && yy&&zz'
  });

  t.deepEqual(d, { a: ['xx', 'yy', 'zz'] });
});
