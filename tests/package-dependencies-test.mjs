import test from "ava";
import { StringContentEntry } from "content-entry";
import { Package } from "../src/mergers/package.mjs";

test("package optional dev dependencies", t => {
  t.deepEqual(
    Package.optionalDevDependencies(new Set(["a", "cracks", "dont-crack"])),
    new Set(["cracks", "dont-crack"])
  );
});

test("package optional dev dependencies empty", t => {
  t.deepEqual(Package.optionalDevDependencies(new Set()), new Set());
});

test("package used dev dependencies", async t => {
  t.deepEqual(
    await Package.usedDevDependencies(
      new StringContentEntry(
        "package.json",
        JSON.stringify({
          release: {
            verifyRelease: "cracks"
          }
        })
      )
    ),
    new Set(["cracks"])
  );
});
