import test from "ava";
import { StringContentEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

const FILE_NAME = "a.md";

test("markdown merge", async t => {
  const merged = await Markdown.merge(
    undefined,
    new StringContentEntry(
      FILE_NAME,
      `# Hello
  `
    ),
    new StringContentEntry(
      FILE_NAME,
      `# Hello
  
- a
- b
- c
`
    )
  );

  t.is(
    await merged.entry.getString(),
    `# Hello

-   a
-   b
-   c
`
  );
});


test("markdown merge nop", async t => {
  const commit = await Markdown.merge(
    undefined,
    new StringContentEntry(
      FILE_NAME,
      `# Hello
`
    ),
    new StringContentEntry(
      FILE_NAME,
      `# Hello
`
    )
  );

  t.is(commit, undefined);
});
