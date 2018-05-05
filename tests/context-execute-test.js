import test from 'ava';
import { Context } from '../src/context';
import { GithubProvider } from 'github-repository-provider';

const ora = require('ora');

const REPOSITORY_NAME = 'arlac77/sync-test-repository';
const TEMPLATE_REPO = 'Kronos-Tools/npm-package-template';

/*
test('npmTemplateSync files', async t => {
  const provider = new GithubProvider(process.env.GH_TOKEN);
  const branch = await provider.branch(TEMPLATE_REPO);

  const files = await createFiles(branch);

  t.is(files.find(f => f.path === 'package.json').path, 'package.json');
  t.is(files.find(f => f.path === 'package.json').constructor.name, 'Package');
});
*/

test('npmTemplateSync', async t => {
  const spinner = ora('args');
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });

  const context = new Context(provider, {
    spinner,
    console
  });

  context.targetBranch = await provider.branch(REPOSITORY_NAME);
  context.templateBranch = await provider.branch(TEMPLATE_REPO);

  const pullRequest = context.execute();

  //console.log(pullRequest.name);
  t.truthy(pullRequest.name);

  //await pullRequest.delete();

  //t.pass('worker done');
});
