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
test.only('context prepare', async t => {
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });
  const context = new Context(provider, {
    templateBranchName: TEMPLATE_REPO
  });

  const {
    targetBranch,
    templateBranch,
    properties
  } = await context.prepareExecute(REPOSITORY_NAME);

  t.is(templateBranch.fullCondensedName, TEMPLATE_REPO);
  t.is(targetBranch.fullCondensedName, REPOSITORY_NAME);
  t.is(properties.name, 'sync-test-repository');
});

test('context execute', async t => {
  const spinner = ora('args');
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });

  const context = new Context(provider, {
    spinner,
    console,
    templateBranchName: TEMPLATE_REPO
  });

  //context.targetBranch = await provider.branch(REPOSITORY_NAME);
  //context.templateBranch = await provider.branch(TEMPLATE_REPO);

  const pullRequest = context.execute(REPOSITORY_NAME);

  //console.log(pullRequest.name);
  t.truthy(pullRequest.name);

  //await pullRequest.delete();

  //t.pass('worker done');
});
