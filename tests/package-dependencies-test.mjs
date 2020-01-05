import test from "ava";
import { Package } from "../src/package.mjs";

test("package optional dev dependencies", t => {
  const pkg = new Package("package.json");
  t.deepEqual(
    pkg.optionalDevDependencies(new Set(["a", "cracks", "dont-crack"])),
    new Set(["cracks", "dont-crack"])
  );
});

test("package optional dev dependencies empty", t => {
  const pkg = new Package("package.json");
  t.deepEqual(pkg.optionalDevDependencies(new Set()), new Set());
});

const PACKAGE_FILE_CONTENT = `{
  "release": {
    "verifyRelease": "cracks"
  }
}`;

test("package used dev dependencies", async t => {
  const pkg = new Package("package.json");
  t.deepEqual(
    await pkg.usedDevDependencies(PACKAGE_FILE_CONTENT),
    new Set(["cracks"])
  );
});
