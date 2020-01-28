import test from "ava";
import { GithubProvider } from "github-repository-provider";

import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";

const TEMPLATE_REPO = "Kronos-Tools/npm-package-template";

test("context prepare from template", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );
  const context = new Context(provider, {
    properties: { mySpecialKey: "mySpecialValue" }
  });

  const pc = await PreparedContext.from(context, TEMPLATE_REPO);

  t.is(pc.targetBranch, undefined);
  t.deepEqual(pc.templateBranches.map(b => b.fullCondensedName), [TEMPLATE_REPO]);
  //t.is(pc.properties.name, 'sync-test-repository');
  t.is(pc.properties.mySpecialKey, "mySpecialValue");
});
