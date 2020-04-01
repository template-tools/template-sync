import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";

import { Replace } from "../src/mergers/replace.mjs";

test("replace differ", async t => {
  const merged = await Replace.merge(
    await createContext(),
    new StringContentEntry("aFile", "Line 1"),
    new StringContentEntry("aFile", "Line 1x")
  );

  t.is(await merged.entry.getString(), "Line 1x");
});

test("replace equal", async t => {
  const merged = await Replace.merge(
    await createContext(),
    new StringContentEntry("aFile", "Line 1"),
    new StringContentEntry("aFile", "Line 1")
  );

  t.is(merged, undefined);
});
