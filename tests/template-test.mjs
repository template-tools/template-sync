import test from "ava";
import { MockProvider } from "mock-repository-provider";
import { StringContentEntry } from "content-entry";

import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";
import { Package } from "../src/mergers/package.mjs";
import { Travis } from "../src/mergers/travis.mjs";

const provider = new MockProvider({
  template_no_travis: {
    master: {
      "package.json": JSON.stringify({
        template: {
          mergers: [{ enabled: false, type: "Travis", pattern: ".travis.yml" }],
          inheritFrom: ["template"]
        }
      })
    }
  },
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
          mergers: [{ enabled: true, type: "Travis", pattern: ".travis.yml" }],
          inheritFrom: ["template_b"]
        }
      }),
      file_b: "content b"
    }
  }
});

const context = new Context(provider);

test("template constructor", async t => {
  const template = await new Template(context, ["template"]);
  t.true(template instanceof Template);

  t.deepEqual(template.sources, ["template"]);
  t.is(`${template}`, "template");
  t.is(template.name, "template");
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

test("template mergers", async t => {
  const template = await new Template(context, ["template"]);

  t.deepEqual(template.mergers, [
    {
      enabled: true,
      type: "Package",
      factory: Package,
      pattern: "package.json",
      options: { ...Package.defaultOptions, o1: 77 }
    },
    {
      enabled: true,
      type: "Travis",
      factory: Travis,
      pattern: ".travis.yml",
      options: { ...Travis.defaultOptions }
    }
  ]);
});

test("template properties", async t => {
  const template = await new Template(context, ["template"]);

  t.deepEqual(await template.properties(), {
    a: 1
  });
});

test("template entry merger", async t => {
  const template = await new Template(context, ["template"]);
  const pkg = template.entry("package.json");

  t.deepEqual(pkg.merger, {
    enabled: true,
    factory: Package,
    type: "Package",
    pattern: "package.json",
    options: {
      messagePrefix: "",
      mergeHints: {},
      expand: true,
      actions: [],
      keywords: [],
      optionalDevDependencies: ["cracks", "dont-crack"],
      o1: 77
    }
  });
});

test("template merge travis", async t => {
  const template = await new Template(context, ["template"]);

  const t1 = new StringContentEntry(
    ".travis.yml",
    `jobs:
  include:
    - stage: test
      node_js:
        - 13.13.0
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

  const tm = await template.mergeEntry(
    { expand: x => x },
    await provider.branch("template"),
    t2,
    t1
  );
  t.is(
    await tm.getString(),
    `jobs:
  include:
    - stage: test
      script:
        - npm run cover
        - npx codecov
      node_js: 13.13.0
`
  );
});

test("template merged entries", async t => {
  const template = await new Template(context, ["template"], { key: "a" });

  for (const i of ["a", "b"]) {
    const f = await template.entry(`file_${i}`);
    t.is(f.name, `file_${i}`);
    t.is(await f.getString(), `content ${i}`);
  }
});

test("template package content", async t => {
  const template = await new Template(context, ["template"], { key: "b" });

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: {
      properties: { a: 1 },
      mergers: [
        {
          enabled: true,
          type: "Package",
          pattern: "package.json",
          options: { ...Package.defaultOptions, o1: 77 }
        },
        {
          enabled: true,
          type: "Travis",
          pattern: ".travis.yml",
          options: {
            ...Travis.defaultOptions,
            mergeHints: { ...Travis.defaultOptions.mergeHints, "*node_js": {} }
          }
        }
      ],
      inheritFrom: ["template_b"]
    }
  });
});

test.skip("template disavle_merger", async t => {
  const template = await new Template(context, ["template_no_travis"]);

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: {
      properties: { a: 1 },
      mergers: [
        {
          enabled: false,
          type: "Travis",
          pattern: ".travis.yml",
          options: {
            ...Travis.defaultOptions,
            mergeHints: { ...Travis.defaultOptions.mergeHints, "*node_js": {} }
          }
        },
        {
          enabled: true,
          type: "Package",
          pattern: "package.json",
          options: { ...Package.defaultOptions, o1: 77 }
        }
      ],
      inheritFrom: ["template"]
    }
  });
});
