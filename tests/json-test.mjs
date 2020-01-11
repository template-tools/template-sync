import test from "ava";
import { createContext } from "./util.mjs";
import { JSONFile } from "../src/json-file.mjs";

const FILE_NAME = "a.json";

test("json merge", async t => {
  const context = await createContext(
    JSON.stringify({
      key: "value"
    }),
    JSON.stringify({
      oldKey: "oldValue"
    }),
    FILE_NAME
  );

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    key: "value",
    oldKey: "oldValue"
  });
});

test("json empty template", async t => {
  const context = await createContext(
    undefined,
    JSON.stringify({
      oldKey: "oldValue"
    }),
    FILE_NAME
  );

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);
  t.is(merged.changed, false);
  //t.is(merged, undefined);
});

test("json empty target", async t => {
  const context = await createContext(
    JSON.stringify({
      key: "value"
    }),
    undefined,
    FILE_NAME
  );

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    key: "value"
  });
});
