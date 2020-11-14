import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { ReplaceIfEmpty } from "../src/mergers/replace-if-empty.mjs";

test("replace-if-empty differ", async t => {
  const merged = await asyncIterator2scalar(ReplaceIfEmpty.commits(
    await createContext({ name: 'a name' }),
    new EmptyContentEntry("aFile"),
    new StringContentEntry("bFile", "Line 1x {{name}}"),
    { expand: false }
  ));

  t.is(await merged.entry.getString(), "Line 1x {{name}}");
  t.is(await merged.entry.name, "aFile");
});

test("replace-if-empty differ with expand", async t => {
  const merged = await asyncIterator2scalar(ReplaceIfEmpty.commits(
    await createContext({ name: 'a name' }),
    new EmptyContentEntry("aFile"),
    new StringContentEntry("bFile", "Line 1x {{name}}"),
    { expand: true }
  ));

  t.is(await merged.entry.getString(), "Line 1x a name");
  t.is(await merged.entry.name, "aFile");
});

test("replace-if-empty nop", async t => {
  const merged = await asyncIterator2scalar(ReplaceIfEmpty.commits(
    await createContext({ name: 'a name' }),
    new StringContentEntry("aFile", "Line 1"),
    new StringContentEntry("bFile", "Line 1")
  ));

  t.is(merged, undefined);
});
