import test from 'ava';
import { Context } from '../src/context';
import { PreparedContext } from '../src/prepared-context';
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

test('context prepare', async t => {
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });
  const context = new Context(provider, {
    templateBranchName: TEMPLATE_REPO,
    properties: { mySpecialKey: 'mySpecialValue' }
  });

  const pc = await PreparedContext.from(context, REPOSITORY_NAME);

  t.is(pc.templateBranch.fullCondensedName, TEMPLATE_REPO);
  t.is(pc.targetBranch.fullCondensedName, REPOSITORY_NAME);
  t.is(pc.properties.name, 'sync-test-repository');
  t.is(pc.properties.mySpecialKey, 'mySpecialValue');
});

test('context execute', async t => {
  const spinner = ora('args');
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });

  const context = await PreparedContext.from(
    new Context(provider, {
      spinner,
      console,
      templateBranchName: TEMPLATE_REPO
    }),
    REPOSITORY_NAME
  );

  const pullRequest = context.execute();

  //console.log(pullRequest.name);
  t.truthy(pullRequest.name);

  //await pullRequest.delete();

  //t.pass('worker done');
});
