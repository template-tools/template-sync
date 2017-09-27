import test from 'ava';
import { BitbucketProvider } from '../src/bitbucket-repository-provider';

const REPOSITORY_URL =
  'https://arlac77@bitbucket.org/arlac77/sync-test-repository.git';
const REPOSITORY_NAME = 'arlac77/sync-test-repository';

test('provider', async t => {
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
