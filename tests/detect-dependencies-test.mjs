import test from "ava";
import { MockProvider } from "mock-repository-provider";
import {
  optionalDevDependencies,
  usedDevDependencies
} from "../src/detect-dependencies.mjs";
import { Package } from "../src/mergers/package.mjs";
import { Rollup } from "../src/mergers/rollup.mjs";

const mergers = [
  [Package, "package.json"],
  [Rollup, "rollup.config.*"]
];

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

test("used dev dependencies", async t => {
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

  t.deepEqual(
    await usedDevDependencies(mergers, await provider.branch("targetRepo")),
    new Set([ "cracks", "rollup-plugin-babel"])
  );
});

test("optional dev dependencies", async t => {
  t.deepEqual(
    await optionalDevDependencies(mergers, new Set(["rollup-plugin-babel"])),
    new Set(["rollup-plugin-babel"])
  );
});
