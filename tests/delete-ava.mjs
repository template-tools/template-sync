import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";
import { Delete } from "../src/mergers/delete.mjs";

test("replace differ", async t => {
  const commit = await asyncIterator2scalar(
    Delete.commits(
      await createContext({ name: "a name" }),
      new StringContentEntry("aFile", undefined, "Line 1"),
      new StringContentEntry("bFile", undefined, "Line 1x"),
      { expand: false }
    )
  );

  t.is(await commit.entries[0].string, "");
  t.is(commit.entries[0].isDeleted, true);
  t.is(commit.entries[0].name, "aFile");
});
