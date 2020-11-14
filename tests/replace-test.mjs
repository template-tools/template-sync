import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";
import { Replace } from "../src/mergers/replace.mjs";

test("replace differ", async t => {
  const merged = await asyncIterator2scalar(
    Replace.commits(
      await createContext({ name: "a name" }),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1x {{name}}"),
      { expand: false }
    )
  );

  t.is(await merged.entry.getString(), "Line 1x {{name}}");
  t.is(merged.entry.name, "aFile");
});

test("replace differ expand", async t => {
  const merged = await asyncIterator2scalar(
    Replace.commits(
      await createContext({ name: "a name" }),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1x {{name}}"),
      { expand: true }
    )
  );

  t.is(await merged.entry.getString(), "Line 1x a name");
  t.is(merged.entry.name, "aFile");
});

test("replace equal", async t => {
  const merged = await asyncIterator2scalar(
    Replace.commits(
      await createContext(),
      new StringContentEntry("aFile", "Line 1"),
      new StringContentEntry("bFile", "Line 1")
    )
  );

  t.is(merged, undefined);
});
