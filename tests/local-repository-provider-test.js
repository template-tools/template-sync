import test from 'ava';
import { LocalProvider } from '../src/local-repository-provider';

const path = require('path');

const workspace = path.join(__dirname, '..', 'build', 'sample_repo');

const config = { workspace };

const REPOSITORY_NAME = 'https://github.com/arlac77/sync-test-repository.git';

test('local provider', async t => {
  const provider = new LocalProvider(config);

  const repository = await provider.repository(REPOSITORY_NAME);

  t.is(repository.name, REPOSITORY_NAME);
});

test('local provider create branch', async t => {
  const provider = new LocalProvider(config);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branches = await repository.branches();

  const newName = `test-${branches.size}`;
  const branch = await repository.createBranch(newName);

  t.is(branch.name, newName);

  await repository.deleteBranch(newName);
  t.is(branches.get(newName), undefined);
});

test.skip('local provider list files', async t => {
  const provider = new LocalProvider(config);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branch = await repository.branch('master');

  const files = await branch.list();

  t.is(files[0].path, 'README.md');
});
