import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
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

  t.is(await commit.entries[0].string, ["Line 3", "Line 2"].join("\n"));
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
    await commit.entries[0].string,
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

  t.is(await commit.entries[0].string, "Line 1\n");
});

test("MergeLineSet from empty", async t => {
  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n") + "\n"),
      new EmptyContentEntry("aFile")
    )
  );

  t.is(commit, undefined);
});

test("MergeLineSet into empty", async t => {

  const commit = await asyncIterator2scalar(
    MergeLineSet.commits(
      await createContext(),
      new EmptyContentEntry("aFile"),
      new StringContentEntry("aFile", ["Line 1", "Line 2"].join("\n") + "\n")
    )
  );

  t.is(await commit.entries[0].string, ["Line 2", "Line 1"].join("\n") + "\n");
});
