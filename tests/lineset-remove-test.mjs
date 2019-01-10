import test from "ava";
import { Context } from "../src/context";
import { PreparedContext } from "../src/prepared-context";
import { MergeAndRemoveLineSet } from "../src/merge-and-remove-line-set";
import { MockProvider } from "mock-repository-provider";

test("MergeAndRemoveLineSet lines", async t => {
  const provider = new MockProvider({
    templateRepo: { master: { aFile: ["- Line 1", "Line 2"].join("\n") } },
    targetRepo: { master: { aFile: ["Line 1", "Line 3"].join("\n") } }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new MergeAndRemoveLineSet("aFile", {
    message: "chore(something): updated from template"
  });
  const merged = await merger.merge(context);
  t.deepEqual(merged.content, ["Line 2", "Line 3"].join("\n"));
  t.true(merged.messages.includes("chore(something): updated from template"));
});
