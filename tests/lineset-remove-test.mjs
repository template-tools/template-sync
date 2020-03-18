import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { MergeLineSet } from "../src/mergers/merge-line-set.mjs";

test("MergeLineSet lines remove", async t => {
  const context = await createContext();

  const commit = await MergeLineSet.merge(context,
    new StringContentEntry('a',["-Line 1", "Line 2"].join("\n")),
    new StringContentEntry('a',["Line 1", "Line 3"].join("\n")), {
    messagePrefix: "chore(something): "
  });

  t.is(await commit.entry.getString(), ["Line 3", "Line 2"].join("\n"));
  t.is(commit.message, "chore(something): merge from template aFile");
});
