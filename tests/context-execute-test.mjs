import test from "ava";
import { GithubProvider } from "github-repository-provider";

import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";

const REPOSITORY_NAME = "arlac77/sync-test-repository";
const TEMPLATE_REPO = "Kronos-Tools/npm-package-template";

test("context prepare", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );
  const context = new Context(provider, {
    templates: [TEMPLATE_REPO],
    properties: { mySpecialKey: "mySpecialValue" }
  });

  const pc = await PreparedContext.from(context, REPOSITORY_NAME);

  t.deepEqual(pc.templateBranches.map(b => b.fullCondensedName), [TEMPLATE_REPO]);
  t.is(pc.targetBranch.fullCondensedName, REPOSITORY_NAME);

  t.is(pc.properties.mySpecialKey, "mySpecialValue");
  t.is(pc.properties.name, "sync-test-repository");
});

test("context execute - PR", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await PreparedContext.from(
    new Context(provider, {
      console,
      templates: [TEMPLATE_REPO]
    }),
    REPOSITORY_NAME
  );

  const pullRequest = await context.execute();

  t.truthy(pullRequest && pullRequest.name);

  /*
  console.log("SOURCE",pullRequest.source.name);
  console.log("DSTINATION",pullRequest.destination.name);
  */
  await pullRequest.destination.delete();
  await pullRequest.delete();
});
