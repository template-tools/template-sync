import test from "ava";
import { Merger } from "../src/merger.mjs";

test("optionalDevDependencies", t => {
  t.deepEqual(
    Merger.optionalDevDependencies(
      new Set(["a"]),
      new Set(["@rollup/plugin-a", "b"]),
      {
        optionalDevDependencies: ["@rollup/plugin", "x"]
      },
    ),
    new Set(["a", "@rollup/plugin-a"])
  );
});
