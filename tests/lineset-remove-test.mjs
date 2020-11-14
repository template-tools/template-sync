import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";
import { MergeLineSet } from "../src/mergers/merge-line-set.mjs";

test("MergeLineSet lines remove", async t => {
  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new StringContentEntry("aFile", ["Line 1", "Line 3"].join("\n")),
      new StringContentEntry("aFile", ["-Line 1", "Line 2"].join("\n")),
      {
        messagePrefix: "chore(something): "
      }
    )
  );

  t.is(await commit.entries[0].getString(), ["Line 3", "Line 2"].join("\n"));
  // t.is(commit.message, "chore(something): remove Line 1\nchore(something): add Line 2");
});

test("MergeLineSet keepHints", async t => {
  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new StringContentEntry("aFile", ["Line 3"].join("\n")),
      new StringContentEntry("aFile", ["-Line 1", "Line 2"].join("\n")),
      {
        mergeHints: { "*": { keepHints: true } }
      }
    )
  );

  t.is(
    await commit.entries[0].getString(),
    ["Line 3", "-Line 1", "Line 2"].join("\n")
  );
});

test("MergeLineSet nop", async t => {
  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n") + "\n"),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n"))
    )
  );

  t.is(commit, undefined);
});

test("MergeLineSet ignore option", async t => {
  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n") + "\n"),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n")),
      {
        ignore: ["Line 2"]
      }
    )
  );

  t.is(await commit.entries[0].getString(), "Line 1\n");
});
