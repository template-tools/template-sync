import test from "ava";
import { createContext } from "./util.mjs";
import { MergeLineSet } from "../src/merge-line-set.mjs";

test("merge lines", async t => {
  const context = await createContext(
    ["Line 1", "Line 2"].join("\n"),
    ["Line 1", "Line 3"].join("\n"),
    "aFile"
  );

  const merger = new MergeLineSet("aFile");
  const merged = await merger.merge(context);
  t.is(merged.content, ["Line 1", "Line 2", "Line 3"].join("\n"));

  t.true(merged.messages.includes("fix: update aFile from template"));
});
