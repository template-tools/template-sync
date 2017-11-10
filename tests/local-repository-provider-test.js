import test from 'ava';
import { LocalProvider } from '../src/local-repository-provider';

const path = require('path');

test('local provider', async t => {
  const dir = path.join(__dirname, '..', 'build', 'sample_repo');

  const provider = new LocalProvider({
    workspace: dir
  });

  const repository = await provider.repository(
    'https://github.com/arlac77/sync-test-repository.git'
  );

  t.is(repository.name, 'https://github.com/arlac77/sync-test-repository.git');
});
