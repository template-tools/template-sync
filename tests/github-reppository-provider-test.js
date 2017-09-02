import test from 'ava';
import { GithubProvider } from '../src/github-repository-provider';

const REPOSITORY_NAME = 'arlac77/sync-test-repository';

test.only('provider', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);

  const repository = await provider.repository(REPOSITORY_NAME);

  t.is(repository.name, REPOSITORY_NAME);

  const branches = await repository.branches();
  t.deepEqual(branches.get('master').name, 'master');

  const branch = await repository.branch('master');
  t.is(branch.name, 'master');
});

test.only('create branch', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);

  const repository = await provider.repository(REPOSITORY_NAME);

  const branches = await repository.branches();

  const branch = await repository.createBranch(
    `test-${branches.count}`,
    'master'
  );
  t.is(branch.name, 'master');
});
