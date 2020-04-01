import test from "ava";
import { MockProvider } from "mock-repository-provider";
import {
  optionalDevDependencies,
  usedDevDependencies
} from "../src/detect-dependencies.mjs";
import { Package } from "../src/mergers/package.mjs";
import { Rollup } from "../src/mergers/rollup.mjs";

const mergers = [Package, Rollup].map(m => [m, m.pattern]);

test("used dev dependencies", async t => {
  const provider = new MockProvider({
    targetRepo: {
      master: {
        "rollup.config.js": `import babel from 'rollup-plugin-babel';
        export default {
          plugins: [],
          input: 'file.js',
          output: {
            format: 'cjs',
            file: 'main.js'
          }
        };`,
        "package.json": JSON.stringify({
          "release": {
            "verifyRelease": "cracks"
          }
        })
      }
    }
  });

  t.deepEqual(
    await usedDevDependencies(mergers, await provider.branch("targetRepo")),
    new Set(["cracks", "rollup-plugin-babel"])
  );
});

test("optional dev dependencies", async t => {
  t.deepEqual(
    await optionalDevDependencies(mergers, new Set(["rollup-plugin-babel"])),
    new Set(["rollup-plugin-babel"])
  );
});
