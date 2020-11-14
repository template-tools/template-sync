import test from "ava";
import { StringContentEntry } from "content-entry";
import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { TOML } from "../src/mergers/toml.mjs";
import stringify from "@iarna/toml/stringify.js";
import parse from "@iarna/toml/parse-string.js";

test("toml merge", async t => {
  const commit = await asyncIterator2scalar(
    TOML.commits(
      await createContext({
        description: "the description"
      }),
      new StringContentEntry(
        "a.toml",
        stringify({
          key: "{{description}}"
        })
      ),
      new StringContentEntry(
        "a.toml",
        stringify({
          oldKey: "oldValue"
        })
      ),
      { ...TOML.options, expand: true }
    )
  );

  t.deepEqual(parse(await commit.entries[0].getString()), {
    key: "the description",
    oldKey: "oldValue"
  });
});
