import test from 'ava';
import { BitbucketProvider } from '../src/bitbucket-repository-provider';

const REPOSITORY_URL = 'https://arlac77@bitbucket.org/arlac77/sync-test-repository.git';
const REPOSITORY_NAME = 'arlac77/sync-test-repository';

test('provider', async t => {
  const provider = new BitbucketProvider();
  const repository = await provider.repository(REPOSITORY_NAME);

  t.is(repository.name, REPOSITORY_NAME);
});
