import test from "ava";
import { MockProvider } from "mock-repository-provider";

import { Template } from "../src/template.mjs";

const provider = new MockProvider({
  template: {
    master: {
      "package.json": JSON.stringify({
        devDependencies: { ava: "^2.4.0" },
        template: {
          files: [{ merger: "Package", pattern: "package.json" }],
          inheritFrom: ["template_b"]
        }
      })
    }
  },
  template_b: {
    master: {
      "package.json": JSON.stringify({
        devDependencies: { rollup: "^1.29.1" }
      })
    }
  }
});

test("template constructor", t => {
  const template = new Template(provider, ["template"]);
  t.deepEqual(template.templates, ["template"]);
  t.is(`${template}`, "template");
});

test("template cache", t => {
  const t1 = Template.templateFor(provider, ["template"]);
  t.deepEqual(t1.templates, ["template"]);
  const t2 = Template.templateFor(provider, ["template"]);
  t.is(t1, t2);
});

test("template package content", async t => {
  const template = new Template(provider, ["template"]);

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: { files: [{ merger: "Package", pattern: "package.json" }],inheritFrom: ["template_b"] }
  });
});

test("template mergers", async t => {
  const template = new Template(provider, ["template"]);

  const mergers = await template.mergers();

  t.is(mergers.length, 1);
  t.is(mergers[0].name,"package.json");
});
