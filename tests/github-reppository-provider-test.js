import test from 'ava';
import { GithubProvider } from '../src/github-repository-provider';

test.only('provider', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);

  const repository = await provider.repository('arlac77/npm-template-sync');

  t.is(repository.name, 'arlac77/npm-template-sync');

  const branches = await repository.branches();
  t.deepEqual(branches.get('master').name, 'master');

  const branch = await repository.branch('master');
  t.is(branch.name, 'master');
});
