import test from "ava";
import { MockProvider } from "mock-repository-provider";
import { StringContentEntry } from "content-entry";

import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";

const provider = new MockProvider({
  template: {
    master: {
      "package.json": JSON.stringify({
        devDependencies: { ava: "^2.4.0" },
        template: {
          mergers: [
            { type: "Package", pattern: "package.json", options: { o1: 77 } }
          ],
          inheritFrom: ["template_b"]
        }
      }),
      file_a: "content a"
    }
  },
  template_b: {
    master: {
      "package.json": JSON.stringify({
        devDependencies: { rollup: "^1.29.1" },
        template: {
          properties: { a: 1 },
          mergers: [{ type: "Travis", pattern: ".travis.yml" }],
          inheritFrom: ["template_b"]
        }
      }),
      file_b: "content b"
    }
  }
});

const context = new Context(provider);

test.serial("template constructor", async t => {
  const template = new Template(context, ["template"]);
  t.deepEqual(template.sources, ["template"]);
  t.is(`${template}`, "template");
  t.is(template.name, "template");

  const m = await template.mergers();

  //console.log(m);
  //t.is(m.length, 2);

  t.deepEqual(m[0][2], {
    messagePrefix: "",
    mergeHints: {},
    expand: true,
    actions: [],
    keywords: [],
    optionalDevDependencies: ["cracks", "dont-crack"],
    o1: 77
  });

  for (const i of ["a", "b"]) {
    const f = await template.entry(`file_${i}`);
    t.is(f.name, `file_${i}`);
    t.is(await f.getString(), `content ${i}`);
  }
});

test("template source sort", async t => {
  const t1 = await Template.templateFor(context, ["t2", "t1"]);
  t.deepEqual(t1.sources, ["t1", "t2"]);
});

test("template source expression", async t => {
  const t1t2 = await Template.templateFor(context, ["t1", "t2", "t1", "-t3"]);
  t.deepEqual(t1t2.sources, ["t1", "t2"]);

  const tx = await Template.templateFor(context, ["t1", "t2", "-t2"]);
  t.deepEqual(tx.sources, ["t1"]);
});

test("template cache", async t => {
  const t1 = await Template.templateFor(context, "template");
  t.deepEqual(t1.sources, ["template"]);
  const t2 = await Template.templateFor(context, "template");
  t.is(t1, t2);
});

test("template package content", async t => {
  const template = new Template(context, ["template"]);

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: {
      properties: { a: 1 },
      mergers: [
        { type: "Package", pattern: "package.json", options: { o1: 77 } },
        { type: "Travis", pattern: ".travis.yml" }
      ],
      inheritFrom: ["template_b"]
    }
  });
});

test("template properties", async t => {
  const template = new Template(context, ["template"]);

  t.deepEqual(await template.properties(), {
    a: 1
  });
});

test("template mergers", async t => {
  const template = new Template(context, ["template"]);
  const mergers = await template.mergers();

  t.is(mergers.length, 1);
  t.is(mergers[0][0], "package.json");
  t.is(mergers[0][1].name, "Package");
});

test("template merge travis", async t => {
  const template = new Template(context, ["template"]);
  const t1 = new StringContentEntry(
    ".travis.yml",
    `jobs:
  include:
    - stage: test
      node_js:
        - 13.8.0
`
  );
  const t2 = new StringContentEntry(
    ".travis.yml",
    `jobs:
  include:
    - stage: test
      script:
        - npm run cover
        - npx codecov
`
  );

  const tm = await template.mergeEntry({ expand: x => x }, t2, t1);
  t.is(
    await tm.getString(),
    `jobs:
  include:
    - stage: test
      script:
        - npm run cover
        - npx codecov
      node_js: 13.8.0
`
  );
});
