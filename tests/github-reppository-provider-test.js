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

test('create commit', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);

  const branches = await repository.branches();

  const newName = `commit-test-${branches.size}`;
  const branch = await repository.createBranch(newName);

  const commit = await branch.commit('message text', [
    {
      path: `README.md`,
      content: `file content #${branches.size}`
    }
  ]);

  t.is(commit.ref, `refs/heads/${newName}`);
});

test('list files', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branch = await repository.branch('master');

  const files = await branch.list();

  t.is(files[0].path, `README.md`);
  t.is(files[1].path, `tests`);
  t.is(files[2].path, `tests/rollup.config.js`);
});

test('content', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branch = await repository.branch('master');

  const content = await branch.content('README.md');

  t.is(content.length == 5, true);
});

test('missing content', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repository = await provider.repository(REPOSITORY_NAME);
  const branch = await repository.branch('master');

  try {
    const content = await branch.content('missing/file', {
      ignoreMissing: true
    });
    t.pass();
  } catch (e) {
    t.fail(e);
  }
});
