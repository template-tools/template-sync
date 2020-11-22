import test from "ava";
import MockProvider from "mock-repository-provider";
import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";

const pkg = inheritFrom => {
  return {
    master: {
      "package.json": JSON.stringify({
        template: {
          inheritFrom: inheritFrom
        }
      })
    }
  };
};

const provider = new MockProvider({
  template: pkg(["template_b"]),
  template_b: pkg(["template"]),
  template_no_travis: pkg(["template"])
});

const context = new Context(provider);

async function tt(t, sources, key) {
  const template = await new Template(context, sources);
  t.true(template instanceof Template);

  t.deepEqual(template.sources, sources, "sources");
  t.is(`${template}`, sources.join(","), "toString");
  t.is(template.name, sources.join(","), "name");
  t.is(template.key, key, "key");
}

tt.title = (providedTitle = "", sources, key) =>
  `Template key ${providedTitle}[${sources}] '${key}'`.trim();

test(tt, ["template"], "template,template_b");
test(tt, ["template_b", "template"], "template,template_b");
test(tt, ["template", "template_b"], "template,template_b");
