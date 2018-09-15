import test from "ava";
import { Context } from "../src/context";
import { PreparedContext } from "../src/prepared-context";
import { NpmIgnore } from "../src/npm-ignore";
import { MockProvider } from "mock-repository-provider";

test("NpmIgnore lines", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: { ".npmignore": ["- Line 1", "Line 2"].join("\n") }
    },
    targetRepo: {
      master: { ".npmignore": ["Line 1", ".DS_Store"].join("\n") }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new NpmIgnore(".npmignore");

  const merged = await merger.merge(context);
  t.deepEqual(merged.content, ["Line 2"].join("\n"));
});
