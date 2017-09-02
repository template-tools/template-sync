import test from 'ava';
import { GithubProvider } from '../src/github-repository-provider';

const REPOSITORY_NAME = 'arlac77/sync-test-repository';

test('provider', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);

  const repository = await provider.repository(REPOSITORY_NAME);

  t.is(repository.name, REPOSITORY_NAME);

  const branches = await repository.branches();
  t.is(branches.get('master').name, 'master');

  const branch = await repository.branch('master');
  t.is(branch.name, 'master');
});

test.only('create branch', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);

  const repository = await provider.repository(REPOSITORY_NAME);

  const branches = await repository.branches();

  t.is(branches.get('master').name, 'master');

  //console.log(Array.from(branches).map(b => b.name));
  console.log(branches);
  //console.log(`test-${branches.size}`);

  const branch = await repository.createBranch(`test-${branches.size}`);

  /*
  t.is(branch.name, 'master');
  */
});
