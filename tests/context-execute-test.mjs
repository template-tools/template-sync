import test from "ava";
import { GithubProvider } from "github-repository-provider";
import { Context } from "../src/context.mjs";

const REPOSITORY_NAME = "arlac77/sync-test-repository";
const TEMPLATE_REPO = "Kronos-Tools/npm-package-template";

test("context prepare", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await Context.from(provider, REPOSITORY_NAME, {
    templateSources: [TEMPLATE_REPO],
    properties: { mySpecialKey: "mySpecialValue" }
  });

  t.is(context.targetBranch.fullCondensedName, REPOSITORY_NAME);

  t.is(context.template.name, TEMPLATE_REPO);
  t.is(context.properties.mySpecialKey, "mySpecialValue");
  t.is(context.properties.name, "sync-test-repository");
});

test("context execute - PR", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await Context.from(provider, REPOSITORY_NAME, {
    console,
    templateSources: [TEMPLATE_REPO]
  });

  const pullRequest = await context.execute();

  t.truthy(pullRequest && pullRequest.name);

  /*
  console.log("SOURCE",pullRequest.source.name);
  console.log("DSTINATION",pullRequest.destination.name);
  */
  await pullRequest.destination.delete();
  await pullRequest.delete();
});
