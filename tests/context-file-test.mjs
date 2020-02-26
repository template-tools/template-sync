import test from "ava";
import { MockProvider } from "mock-repository-provider";

import { Context } from "../src/context.mjs";
import { Package } from "../src/mergers/package.mjs";
import { Rollup } from "../src/mergers/rollup.mjs";

test("context file targetEntry", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: { "package.json": '{"name":"a"}' }
    },
    targetRepo: {
      master: { "package.json": '{"name":"b"}' }
    }
  });

  const context = await Context.from(provider, "targetRepo", {
    templateSources: ["templateRepo"]
  });

  const f = new Package("package.json");

  t.is(await f.targetEntry(context), '{"name":"b"}');
});

const ROLLUP_FILE_CONTENT = `import babel from 'rollup-plugin-babel';

export default {
  plugins: [],
  input: 'file.js',
  output: {
    format: 'cjs',
    file: 'main.js'
  }
};`;

const PACKAGE_FILE_CONTENT = `{
  "release": {
    "verifyRelease": "cracks"
  }
}`;

test("context used dev modules", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        "rollup.config.js": ROLLUP_FILE_CONTENT,
        "package.json": PACKAGE_FILE_CONTENT
      }
    },
    targetRepo: {
      master: {
        "rollup.config.js": ROLLUP_FILE_CONTENT,
        "package.json": PACKAGE_FILE_CONTENT
      }
    }
  });

  const context = await Context.from(provider, "targetRepo", {
    templateSources: ["templateRepo"]
  });

  context.addFile(new Rollup("rollup.config.js"));
  context.addFile(new Package("package.json"));

  t.deepEqual(
    await context.usedDevDependencies(),
    new Set(["rollup-plugin-babel", "cracks"])
  );
});

test("context optional dev modules", async t => {
  const provider = new MockProvider({
    templateRepo: { master: { "rollup.config.js": ROLLUP_FILE_CONTENT } },
    targetRepo: {
      master: {
        "rollup.config.js": ROLLUP_FILE_CONTENT
      }
    }
  });

  const context = await Context.from(provider, "targetRepo", {
    templateSources: ["templateRepo"]
  });

  context.addFile(new Rollup("rollup.config.js"));

  t.deepEqual(
    context.optionalDevDependencies(new Set(["rollup-plugin-babel"])),
    new Set(["rollup-plugin-babel"])
  );
});
