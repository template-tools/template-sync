import test from 'ava';
import { Package } from '../src/package';

test('package scripts decode/encode empty script', t => {
  const d = Package.decodeScripts(undefined);
  t.is(Package.encodeScripts(d), undefined);
});

test('package scripts decode/encode scripts &&', t => {
  const d = Package.decodeScripts({
    a: 'xx && yy&&zz',
    b: 'XXX YYY ZZZ'
  });

  t.deepEqual(d, {
    a: { op: '&&', args: ['xx', 'yy', 'zz'] },
    b: { value: 'XXX YYY ZZZ' }
  });

  d.a.args[1] = 'yy2';

  t.deepEqual(Package.encodeScripts(d), {
    a: 'xx && yy2 && zz',
    b: 'XXX YYY ZZZ'
  });
});

test('package scripts merge undefined', t => {
  let d1 = Package.decodeScripts({
    a: 'xx && yy'
  });

  t.deepEqual(Package.mergeScripts(d1, undefined), {
    a: { op: '&&', args: ['xx', 'yy'] }
  });

  d1 = Package.decodeScripts({
    a: 'xx && yy'
  });

  t.deepEqual(Package.mergeScripts(undefined, d1), {
    a: { op: '&&', args: ['xx', 'yy'] }
  });

  t.is(Package.mergeScripts(undefined, undefined), undefined);
});

test('package scripts decode/merge/encode', t => {
  const d1 = Package.decodeScripts({
    a: 'xx && yy'
  });

  const d2 = Package.decodeScripts({
    a: 'xx'
  });

  t.deepEqual(Package.mergeScripts(d1, d2), {
    a: { op: '&&', args: ['xx', 'yy'] }
  });
});

test('package scripts decode/merge/encode swapped', t => {
  const d1 = Package.decodeScripts({
    a: 'xx && yy'
  });

  const d2 = Package.decodeScripts({
    a: 'xx'
  });

  t.deepEqual(Package.mergeScripts(d2, d1), {
    a: { op: '&&', args: ['xx', 'yy'] }
  });
});

test('package scripts decode/merge/encode remove', t => {
  const d1 = Package.decodeScripts({
    a: 'xx && yy'
  });

  const d2 = Package.decodeScripts({
    a: '-'
  });

  t.deepEqual(Package.mergeScripts(d1, d2), {
  });
});
