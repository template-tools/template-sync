import test from 'ava';
import { worker, createFiles } from '../src/worker';
import { GithubProvider } from '../src/github-repository-provider';

const ora = require('ora');

const REPOSITORY_NAME = 'arlac77/sync-test-repository';
const TEMPLATE_REPO = 'Kronos-Tools/npm-package-template';

test('worker files', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const repo = await provider.repository(TEMPLATE_REPO);
  const branch = await repo.branch('master');

  const files = await createFiles(branch);

  console.log(files);

  t.is(files.find(f => f.path === 'package.json').path, 'package.json');
});

test('worker', async t => {
  const spinner = ora('args');

  await worker(spinner, process.env.GH_TOKEN, REPOSITORY_NAME, TEMPLATE_REPO);

  t.pass('worker done');
});
