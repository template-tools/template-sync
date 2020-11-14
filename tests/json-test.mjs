import test from "ava";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { JSONMerger } from "../src/mergers/json.mjs";

const FILE_NAME = "a.json";

test("json merge", async t => {
  const commit = await asyncIterator2scalar(
    JSONMerger.commits(
      await createContext(),
      new StringContentEntry(
        FILE_NAME,
        JSON.stringify({
          key: "value"
        })
      ),
      new StringContentEntry(
        FILE_NAME,
        JSON.stringify({
          oldKey: "oldValue"
        })
      )
    )
  );

  t.deepEqual(JSON.parse(await commit.entries[0].getString()), {
    key: "value",
    oldKey: "oldValue"
  });
});

test("json empty target", async t => {
  const commit = await asyncIterator2scalar(
    JSONMerger.commits(
      await createContext(),
      new EmptyContentEntry(FILE_NAME),
      new StringContentEntry(
        FILE_NAME,
        JSON.stringify({
          key: "value"
        })
      )
    )
  );

  t.deepEqual(JSON.parse(await commit.entries[0].getString()), {
    key: "value"
  });
});

test("json nop", async t => {
  const commit = await asyncIterator2scalar(
    JSONMerger.commits(
      await createContext(),
      new StringContentEntry(
        FILE_NAME,
        JSON.stringify(
          {
            key: "value"
          },
          undefined,
          2
        )
      ),
      new StringContentEntry(
        FILE_NAME,
        JSON.stringify(
          {
            key: "value"
          },
          undefined,
          2
        )
      )
    )
  );

  t.is(commit, undefined);
});
