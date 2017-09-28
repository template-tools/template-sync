import test from 'ava';
import { BitbucketProvider } from '../src/bitbucket-repository-provider';

const REPOSITORY_URL =
  'https://arlac77@bitbucket.org/arlac77/sync-test-repository.git';
const REPOSITORY_NAME = 'arlac77/sync-test-repository';

test('bitbucket provider', async t => {
  const provider = new BitbucketProvider({
    password: process.env.BITBUCKET_PASSWORD,
    user: process.env.BITBUCKET_USER
  });

  const repository = await provider.repository(REPOSITORY_NAME);

  t.is(repository.name, REPOSITORY_NAME);

  const branches = await repository.branches();
  t.is(branches.get('master').name, 'master');

  const branch = await repository.branch('master');
  t.is(branch.name, 'master');
});

test('provider repo with branch name', async t => {
  const provider = new BitbucketProvider({
    password: process.env.BITBUCKET_PASSWORD,
    user: process.env.BITBUCKET_USER
  });

  const repository = await provider.repository(
    REPOSITORY_NAME + '#some-other-branch'
  );

  const branches = await repository.branches();
  t.is(branches.get('master').name, 'master');
});

test.skip('create branch', async t => {
  const provider = new BitbucketProvider({
    password: process.env.BITBUCKET_PASSWORD,
    user: process.env.BITBUCKET_USER
  });
  const repository = await provider.repository(REPOSITORY_NAME);
  const branches = await repository.branches();

  const newName = `test-${branches.size}`;
  const branch = await repository.createBranch(newName);

  t.is(branch.name, newName);
});

test('bitbucket list', async t => {
  const provider = new BitbucketProvider({
    password: process.env.BITBUCKET_PASSWORD,
    user: process.env.BITBUCKET_USER
  });

  const repository = await provider.repository(REPOSITORY_NAME);
  const branch = await repository.branch('master');

  t.deepEqual(await branch.list(), [{ path: 'README.md' }]);
});
