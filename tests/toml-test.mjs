import test from "ava";
import { createContext } from "./util.mjs";
import { TOML } from "../src/mergers/toml.mjs";
import stringify from "@iarna/toml/stringify.js";
import parse from "@iarna/toml/parse-string.js";


test("toml merge", async t => {
  const fileName = "a.toml";

  const context = await createContext(
    stringify({
      key: "{{description}}"
    }),
    stringify({
      oldKey: "oldValue"
    }),
    fileName,
    { description: "value" }
    );

  const json = new TOML(fileName, { expand: true });
  const merged = await json.merge(context);

  t.deepEqual(parse(merged.content), {
    key: "value",
    oldKey: "oldValue"
  });
});
