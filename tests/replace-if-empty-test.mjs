import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";

import { ReplaceIfEmpty } from "../src/mergers/replace-if-empty.mjs";

test("replace-if-empty differ", async t => {
  const merged = await ReplaceIfEmpty.merge(
    await createContext(),
    new EmptyContentEntry("aFile"),
    new StringContentEntry("bFile", "Line 1x")
  );

  t.is(await merged.entry.getString(), "Line 1x");
  //t.is(await merged.entry.name, "aFile");
});

test("replace-if-empty nop", async t => {
  const merged = await ReplaceIfEmpty.merge(
    await createContext(),
    new StringContentEntry("aFile", "Line 1"),
    new StringContentEntry("aFile", "Line 1")
  );

  t.is(merged, undefined);
});
