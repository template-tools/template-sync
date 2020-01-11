import test from "ava";
import { createContext } from "./util.mjs";
import { NpmIgnore } from "../src/npm-ignore.mjs";

test("NpmIgnore lines", async t => {
  const context = await createContext(
    ["- Line 1", "Line 2"].join("\n"),
    ["Line 1", ".DS_Store"].join("\n"),
    ".npmignore"
  );

  const merger = new NpmIgnore(".npmignore");

  const merged = await merger.merge(context);
  t.deepEqual(merged.content, ["Line 2"].join("\n"));
});
