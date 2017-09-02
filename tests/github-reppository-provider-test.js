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

test('create branch', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branches = await repository.branches();

  //t.is(branches.get('master').name, 'master');

  const newName = `test-${branches.size}`;
  const branch = await repository.createBranch(newName);

  t.is(branch.name, newName);
});

test.only('create commit', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);

  const branches = await repository.branches();

  const newName = `test-${branches.size}`;
  const branch = await repository.createBranch(newName);

  const commit = await branch.commit('message text', [
    {
      path: `file-${branches.size}.txt`,
      content: 'file content'
    }
  ]);

  //console.log(branch);

  t.is(commit, 'xxx');
});
