import test from "ava";
import MockProvider from "mock-repository-provider";
import { StringContentEntry } from "content-entry";

import { Template } from "../src/template.mjs";
import { Context } from "../src/context.mjs";
import { Package } from "../src/mergers/package.mjs";
import { Travis } from "../src/mergers/travis.mjs";

const pkg = (j, other) => {
  return {
    master: {
      "package.json": JSON.stringify(j),
      ...other
    }
  };
};

const provider = new MockProvider({
  t1: pkg(),
  t2: pkg(),
  t3: pkg(),

  template: pkg(
    {
      devDependencies: { ava: "^2.4.0" },
      template: {
        mergers: [
          { type: "Package", pattern: "package.json", options: { o1: 77 } }
        ],
        inheritFrom: ["template_b"]
      }
    },
    { file_a: "content a" }
  ),
  template_b: pkg(
    {
      devDependencies: { rollup: "^1.29.1" },
      template: {
        properties: { a: 1 },
        mergers: [{ enabled: true, type: "Travis", pattern: ".travis.yml" }],
        inheritFrom: ["template"]
      }
    },
    { file_b: "content b" }
  ),
  template_no_travis: pkg({
    template: {
      mergers: [{ enabled: false, type: "Travis", pattern: ".travis.yml" }],
      inheritFrom: ["template"]
    }
  })
});

const context = new Context(provider);

async function tt(t, sources, key) {
  const template = await new Template(context, sources);
  t.true(template instanceof Template);

  t.is(`${template}`, sources.join(","), "toString");
  t.is(template.name, sources.join(","), "name");
  t.is(template.key, key, "key");
}

test("template source expression", async t => {
  const t1t2 = await Template.templateFor(context, ["t1", "t2", "t1", "-t3"]);
  t.deepEqual(t1t2.sources, new Set(["t1", "t2"]));

  const tx = await Template.templateFor(context, ["t1", "t2", "-t2"]);
  t.deepEqual(tx.sources, new Set(["t1"]));
});

test("template cache", async t => {
  const t1 = await Template.templateFor(context, "template");
  t.deepEqual(t1.sources, new Set(["template"]));
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
      options: { ...Package.options, o1: 77 },
      priority: 1
    },
    {
      enabled: true,
      type: "Travis",
      factory: Travis,
      pattern: ".travis.yml",
      options: { ...Travis.options },
      priority: 1
    }
  ]);
});

test("template properties", async t => {
  const template = await new Template(context, ["template"]);

  t.deepEqual(await template.properties(), {
    a: 1,
    template: {
      key: "template",
      name: "template"
    }
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
    priority: 1,
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
    await tm.string,
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
    t.is(await f.string, `content ${i}`);
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
          priority: 1,
          options: { ...Package.options, o1: 77 }
        },
        {
          enabled: true,
          type: "Travis",
          pattern: ".travis.yml",
          priority: 1,
          options: {
            ...Travis.options,
            mergeHints: { ...Travis.options.mergeHints, "*node_js": {} }
          }
        }
      ],
      inheritFrom: ["template_b"]
    }
  });
});

test.skip("template disable_merger", async t => {
  const template = await new Template(context, ["template_no_travis"]);

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: {
      properties: { a: 1 },
      mergers: [
        {
          enabled: false,
          priority: 1,
          type: "Travis",
          pattern: ".travis.yml",
          options: {
            ...Travis.options,
            mergeHints: { ...Travis.options.mergeHints, "*node_js": {} }
          }
        },
        {
          enabled: true,
          priority: 1,
          type: "Package",
          pattern: "package.json",
          options: { ...Package.options, o1: 77 }
        }
      ],
      inheritFrom: ["template"]
    }
  });
});
