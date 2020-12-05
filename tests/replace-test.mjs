import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";
import { Replace } from "../src/mergers/replace.mjs";

test("replace differ", async t => {
  const commit = await asyncIterator2scalar(
    Replace.commits(
      await createContext({ name: "a name" }),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1x {{name}}"),
      { expand: false, messagePrefix: "prefix: " }
    )
  );

  t.is(await commit.entries[0].getString(), "Line 1x {{name}}");
  t.is(commit.entries[0].name, "aFile");
  t.is(commit.message, "prefix: overwrite aFile with template content");
});

test("replace differ expand", async t => {
  const commit = await asyncIterator2scalar(
    Replace.commits(
      await createContext({ name: "a name" }),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1x {{name}}"),
      { expand: true }
    )
  );

  t.is(await commit.entries[0].getString(), "Line 1x a name");
  t.is(commit.entries[0].name, "aFile");
});

test("replace equal", async t => {
  const commit = await asyncIterator2scalar(
    Replace.commits(
      await createContext(),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1")
    )
  );

  t.is(commit, undefined);
});
