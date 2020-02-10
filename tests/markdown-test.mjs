import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { Markdown } from "../src/mergers/markdown.mjs";
const FILE_NAME = "a.md";


test.skip("markdown merge", async t => {
  const context = await createContext(
    `
# Hello
`,
    `
# Hello

- a
- b
- c
`,
FILE_NAME
  );

  const md = new Markdown(FILE_NAME, { expand: true });
  const merged = await md.merge(context);

  t.is(merged.content, `
# Hello
`);
});
