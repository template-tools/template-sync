import test from 'ava';
import { Context } from '../src/context';
import { PreparedContext } from '../src/prepared-context';
import { GithubProvider } from 'github-repository-provider';

const REPOSITORY_NAME = 'arlac77/sync-test-repository';
const TEMPLATE_REPO = 'Kronos-Tools/npm-package-template';

test('context prepare from template', async t => {
  const provider = new GithubProvider({ auth: process.env.GH_TOKEN });
  const context = new Context(provider, {
    properties: { mySpecialKey: 'mySpecialValue' }
  });

  const pc = await PreparedContext.from(context, TEMPLATE_REPO);

  t.is(pc.targetBranch, undefined);
  t.is(pc.templateBranch.fullCondensedName, TEMPLATE_REPO);
  //t.is(pc.properties.name, 'sync-test-repository');
  t.is(pc.properties.mySpecialKey, 'mySpecialValue');
});
