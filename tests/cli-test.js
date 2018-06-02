import test from 'ava';
import { join } from 'path';
import execa from 'execa';

const nts = join(__dirname, '..', 'bin', 'npm-template-sync');

test('cli defines', async t => {
  const c = await execa(nts, [
    '-d',
    'description=a new module',
    '--list-properties'
  ]);
  t.truthy(c.stdout.match(/a new module/));
});

test('cli dryrun', async t => {
  const c = await execa(nts, ['--dry', 'true', 'arlac77/config-expander']);

  /*
  console.log(c.stdout);
  console.log(c.stderr);
*/
  t.is(c.code, 0);
});
