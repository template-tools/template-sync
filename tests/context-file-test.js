import test from "ava";
import { Context } from "../src/context";
import { PreparedContext } from "../src/prepared-context";
import { MockProvider } from "mock-repository-provider";
import { GithubProvider } from "github-repository-provider";
import { Package } from "../src/package";
import { Rollup } from "../src/rollup";

const REPOSITORY_NAME = "arlac77/sync-test-repository";

test("create files", async t => {
  const provider = new GithubProvider(
    GithubProvider.optionsFromEnvironment(process.env)
  );

  const files = await PreparedContext.createFiles(
    await provider.branch(REPOSITORY_NAME + "#master")
  );

  t.is(files.find(f => f.name === "package.json").name, "package.json");
  t.is(files.find(f => f.name === "package.json").constructor.name, "Package");
});

test("context file targetEntry", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: { "package.json": '{"name":"a"}' }
    },
    targetRepo: {
      master: { "package.json": '{"name":"b"}' }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

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

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  context.addFile(new Rollup("rollup.config.js"));
  context.addFile(new Package("package.json"));

  t.deepEqual(
    await context.usedDevModules(),
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

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  context.addFile(new Rollup("rollup.config.js"));

  t.deepEqual(
    context.optionalDevModules(new Set(["rollup-plugin-babel"])),
    new Set(["rollup-plugin-babel"])
  );
});
