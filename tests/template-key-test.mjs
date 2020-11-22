import test from "ava";
import MockProvider from "mock-repository-provider";
import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";

const pkg = inheritFrom => {
  return {
    master: {
      "package.json": JSON.stringify({
        template: {
          inheritFrom
        }
      })
    }
  };
};

const provider = new MockProvider({
  other: pkg([]),
  github: pkg([]),
  uti: pkg(["github"]),
  "arlac77-github": pkg(["github"])
});

const context = new Context(provider);

async function tt(t, sources, name, key = name) {
  const template = await new Template(context, sources);
  t.true(template instanceof Template);

  t.deepEqual(
    template.sources,
    sources.filter(n => !n.startsWith("-")).sort(),
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
test(tt, ["uti"], "uti", "github,uti");
test(
  tt,
  ["uti", "arlac77-github"],
  "arlac77-github,uti",
  "arlac77-github,github,uti"
);
test(
  tt,
  ["arlac77-github", "uti"],
  "arlac77-github,uti",
  "arlac77-github,github,uti"
);
test(tt, ["uti", "arlac77-github", "-github"], "arlac77-github,uti");
