import test from "ava";
import { StringContentEntry } from "content-entry";
import { JSDoc } from "../src/mergers/jsdoc.mjs";

test("optional dev modules", t => {
  t.deepEqual(
    JSDoc.optionalDevDependencies(
      new Set(),
      new Set(["a", "babel-preset-latest"])
    ),
    new Set(["babel-preset-latest"])
  );
});

test("used dev modules", async t => {
  t.deepEqual(
    await JSDoc.usedDevDependencies(
      new Set(),
      new StringContentEntry(
        "a.json",
        `{
      "plugins": [
        "node_modules/jsdoc-babel"
      ],
      "babel": {
        "presets": [
          "es2015",
          "stage-3"
        ]
      }
    }`
      )
    ),
    new Set(["babel-preset-es2015", "babel-preset-stage-3"])
  );
});
