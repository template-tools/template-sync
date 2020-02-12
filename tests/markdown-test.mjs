import test from "ava";
import { StringContentEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

test.skip("markdown merge", async t => {
  const merged = await Markdown.merge(
    undefined,
    new StringContentEntry(
      "a.md",
      `# Hello
  `
    ),
    new StringContentEntry(
      "a.md",
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
`
  );
});
