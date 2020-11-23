import test from "ava";
import MockProvider from "mock-repository-provider";
import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";

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

const otherTemplateAttributes = { usedBy: [] };
const provider = new MockProvider({
  uti: pkg(["github"]),
  other: pkg([], otherTemplateAttributes),
  github: pkg([], otherTemplateAttributes),
  "arlac77-github": pkg(["github"], otherTemplateAttributes)
});

const context = new Context(provider);

async function tt(t, sources, name, key = name) {
  const template = await new Template(context, sources);
  t.true(template instanceof Template);

  t.deepEqual(
    template.sources,
    new Set(sources.filter(n => !n.startsWith("-"))),
    "sources"
  );
  t.is(`${template}`, name, "toString");
  t.is(template.name, name, "name");
  t.is(template.key, key, "key");
}

tt.title = (providedTitle = "", sources, name, key = name) =>
  `Template key ${providedTitle}[${sources}] '${key}'`.trim();

test(tt, ["github"], "github");
test(tt, ["github", "-other"], "github");
test(tt, ["uti"], "uti", "github");
test(
  tt,
  ["uti", "arlac77-github"],
  "arlac77-github,uti",
  "arlac77-github,github"
);
test(tt, ["arlac77-github", "uti"], "arlac77-github,uti", "arlac77-github");
test(
  tt,
  ["uti", "arlac77-github", "-github"],
  "arlac77-github,uti",
  "arlac77-github"
);
