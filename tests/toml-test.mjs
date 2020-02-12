import test from "ava";
import { StringContentEntry } from "content-entry";
import { createContext } from "./helpers/util.mjs";
import { TOML } from "../src/mergers/toml.mjs";
import stringify from "@iarna/toml/stringify.js";
import parse from "@iarna/toml/parse-string.js";

test("toml merge", async t => {
  const commit = await TOML.merge(
    await createContext(undefined, undefined, "a.toml", {
      description: "value"
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
    { ...TOML.defaultOptions, expand: true }
  );

  t.deepEqual(parse(await commit.entry.getString()), {
    key: "value",
    oldKey: "oldValue"
  });
});
