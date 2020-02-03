import test from "ava";
import { createContext } from "./util.mjs";
import { MergeLineSet } from "../src/mergers/merge-line-set.mjs";

test("MergeLineSet lines remove", async t => {
  const context = await createContext(
    ["-Line 1", "Line 2"].join("\n"),
    ["Line 1", "Line 3"].join("\n"),
    "aFile"
  );

  const merger = new MergeLineSet("aFile", {
    messagePrefix: "chore(something): "
  });
  const merged = await merger.merge(context);

  t.deepEqual(merged.content, ["Line 3", "Line 2"].join("\n"));
  t.deepEqual(merged.messages, ["chore(something): merge from template aFile"]);
});
