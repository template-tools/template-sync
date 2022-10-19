import test from "ava";
import { GithubProvider } from "github-repository-provider";

import { Context } from "../src/context.mjs";

const TEMPLATE_REPO = "arlac77/template-root";

test("context prepare from template", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await Context.from(provider, TEMPLATE_REPO, {
    template: [TEMPLATE_REPO],
    properties: { mySpecialKey: "mySpecialValue" }
  });

  // t.is(pc.targetBranch, undefined);
  t.deepEqual(
    [...context.template.branches].map(b => b.fullCondensedName),
    [TEMPLATE_REPO, "arlac77/template-npm"]
  );
  //t.is(pc.properties.name, 'sync-test-repository');
  t.is(context.properties.mySpecialKey, "mySpecialValue");
});
