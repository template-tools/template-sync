import test from 'ava';
import { templateOptions, diffVersion } from '../src/util';

test('templateOptions matching', t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: 'Readme'
            },
            {
              merger: 'Package',
              options: { o1: 77 }
            }
          ]
        }
      },
      'Package'
    ),
    { o1: 77 }
  );
});

test('templateOptions empty', t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: 'Package',
              options: { o1: 77 }
            }
          ]
        }
      },
      'Readme'
    ),
    {}
  );
});


test('diff versions numbers only', t => {
  t.is(diffVersion('1','2'), -1);
  t.is(diffVersion('2','1'), 1);
  t.is(diffVersion(1,2), -1);
  t.is(diffVersion(1.0,2), -1);
  t.is(diffVersion(1.0,'2'), -1);
  t.is(diffVersion('1.0.1','1.0.2'), -1);
});

test('diff versions alpha beta ...', t => {
  t.is(diffVersion('1.0.0-beta.5','1.0.0-beta.6'), -1);
  t.is(diffVersion('1.0.0-beta.6','1.0.0-beta.5'), 1);
  t.is(diffVersion('1.0.0-beta','1.0.0-beta'), 0);
  t.is(diffVersion('1.0.0-alpha','1.0.0-beta'), -1);
  t.is(diffVersion('1.0.0-beta','1.0.0-alpha'), 1);
  t.is(diffVersion('1.0.0-beta','1.0.0-rc'), -1);
  t.is(diffVersion('1.0.0-rc', '1.0.0-beta'), 1);
});
