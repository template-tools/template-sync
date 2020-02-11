import test from "ava";
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

const PACKAGE_FILE_CONTENT = `{
  "release": {
    "verifyRelease": "cracks"
  }
}`;

test("package used dev dependencies", async t => {
  t.deepEqual(
    await Package.usedDevDependencies(PACKAGE_FILE_CONTENT),
    new Set(["cracks"])
  );
});
