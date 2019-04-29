import test from "ava";
import { MockProvider } from "mock-repository-provider";

import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";
import { MergeLineSet } from "../src/merge-line-set.mjs";

test("merge lines", async t => {
  const provider = new MockProvider({
    templateRepo: { master: { aFile: ["Line 1", "Line 2"].join("\n") } },
    targetRepo: { master: { aFile: ["Line 1", "Line 3"].join("\n") } }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new MergeLineSet("aFile");
  const merged = await merger.merge(context);
  t.deepEqual(merged.content, ["Line 1", "Line 2", "Line 3"].join("\n"));

  t.true(merged.messages.includes("fix: update aFile from template"));
});
