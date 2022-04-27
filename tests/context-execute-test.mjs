import test from "ava";
import { GithubProvider } from "github-repository-provider";
import { Context } from "../src/context.mjs";

const REPOSITORY_NAME = "arlac77/sync-test-repository";
const TEMPLATE_REPO = "arlac77/template-node-app";

test("context prepare", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await Context.from(provider, REPOSITORY_NAME, {
    template: TEMPLATE_REPO,
    properties: { mySpecialKey: "mySpecialValue" }
  });

  t.is(context.targetBranch.fullCondensedName, REPOSITORY_NAME);

  //t.is(context.template.name, TEMPLATE_REPO);
  t.is(context.properties.mySpecialKey, "mySpecialValue");
  t.is(context.properties.name, "sync-test-repository");

  t.is(context.properties.repository.name, "sync-test-repository");
  t.is(context.properties.repository.owner, "arlac77");
  t.is(context.properties.repository.type, "git");
});

test("context execute - PR", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const context = await Context.from(provider, REPOSITORY_NAME, {
    logger: (...args) => console.log(...args),
    template: TEMPLATE_REPO
  });

  //context.logLevel = 'trace';

  const pullRequests = [];
  for await (const pr of context.execute()) {
    pullRequests.push(pr);
  }

  t.truthy(pullRequests.length > 0);

  const pullRequest = pullRequests[0];
  t.truthy(pullRequest && pullRequest.name);

  for (const pr of pullRequests) {
    // await pr.destination.delete();
    await pr.delete();
  }
});
