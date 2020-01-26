import test from "ava";
import { createContext } from "./util.mjs";
import { MergeAndRemoveLineSet } from "../src/mergers/merge-and-remove-line-set.mjs";

test("MergeAndRemoveLineSet lines", async t => {
  const context = await createContext(
    ["- Line 1", "Line 2"].join("\n"),
    ["Line 1", "Line 3"].join("\n"),
    "aFile"
  );

  const merger = new MergeAndRemoveLineSet("aFile", {
    message: "chore(something): updated from template"
  });
  const merged = await merger.merge(context);
  t.deepEqual(merged.content, ["Line 2", "Line 3"].join("\n"));
  t.true(merged.messages.includes("chore(something): updated from template"));
});
