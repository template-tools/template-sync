import test from "ava";
import { templateOptions, compareVersion } from "../src/util.mjs";

test("templateOptions matching", t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: "Readme"
            },
            {
              merger: "Package",
              options: { o1: 77 }
            }
          ]
        }
      },
      "Package"
    ),
    { o1: 77 }
  );
});

test("templateOptions empty", t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: "Package",
              options: { o1: 77 }
            }
          ]
        }
      },
      "Readme"
    ),
    {}
  );
});

test("compare versions numbers only", t => {
  t.is(compareVersion("1", "2"), -1);
  t.is(compareVersion("2", "1"), 1);
  t.is(compareVersion(1, 2), -1);
  t.is(compareVersion(1.0, 2), -1);
  t.is(compareVersion(1.0, "2"), -1);
  t.is(compareVersion("1.0.1", "1.0.2"), -1);
});

test("compare versions alpha beta ...", t => {
  t.is(compareVersion("1.0.0-beta.5", "1.0.0-beta.6"), -1);
  t.is(compareVersion("1.0.0-beta.6", "1.0.0-beta.5"), 1);
  t.is(compareVersion("1.0.0-beta", "1.0.0-beta"), 0);
  t.is(compareVersion("1.0.0-alpha", "1.0.0-beta"), -1);
  t.is(compareVersion("1.0.0-beta", "1.0.0-alpha"), 1);
  t.is(compareVersion("1.0.0-beta", "1.0.0-rc"), -1);
  t.is(compareVersion("1.0.0-rc", "1.0.0-beta"), 1);
  t.is(compareVersion("1.0.0-beta.8", "1.0.0-rc.1"), -1);
  t.is(compareVersion("1.0.0-rc.1", "1.0.0-beta.8"), 1);
});

test("sort versions", t => {
  t.deepEqual(
    ["2.0", "1.0", "1.1.0", "1.0-alpha.2", "0.9", "1.0-alpha.1"].sort(
      compareVersion
    ),
    ["0.9", "1.0-alpha.1", "1.0-alpha.2", "1.0", "1.1.0", "2.0"]
  );
});
