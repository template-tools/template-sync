import test from "ava";
import MockProvider from "mock-repository-provider";
import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";

const otherTemplateAttributes = { usedBy: [] };

const pkg = (inheritFrom, other) => {
  return {
    master: {
      "package.json": JSON.stringify({
        template: {
          inheritFrom,
          ...other
        }
      })
    }
  };
};

test.skip("dump template", async t => {
  const provider = new MockProvider({
    uti: pkg(["github"]),
    other: pkg([], otherTemplateAttributes),
    github: pkg([], otherTemplateAttributes),
    "arlac77-github": pkg(["github"], otherTemplateAttributes)
  });

  const context = new Context(provider);
  const template = await new Template(context, ["github"]);

  await template.dump("/tmp/dump");

  t.true(true);
});
