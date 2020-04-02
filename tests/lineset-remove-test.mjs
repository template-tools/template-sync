import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";
import { MergeLineSet } from "../src/mergers/merge-line-set.mjs";

test("MergeLineSet lines remove", async t => {
  const commit = await MergeLineSet.merge(
    await createContext(),
    new StringContentEntry("aFile", ["Line 1", "Line 3"].join("\n")),
    new StringContentEntry("aFile", ["-Line 1", "Line 2"].join("\n")),
    {
      messagePrefix: "chore(something): "
    }
  );

  t.is(await commit.entry.getString(), ["Line 3", "Line 2"].join("\n"));
 // t.is(commit.message, "chore(something): remove Line 1\nchore(something): add Line 2");
});

test("MergeLineSet nop", async t => {
  const commit = await MergeLineSet.merge(
    await createContext(),
    new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n")),
    new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n"))
  );

  t.is(commit, undefined);
});
