import test from "ava";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

const FILE_NAME = "a.md";

test("markdown merge", async t => {
  const merged = await Markdown.merge(
    undefined,
    new StringContentEntry(
      FILE_NAME,
      `# Hello
* a
* b
`
    ),
    new StringContentEntry(
      FILE_NAME,
      `# Other`
    )
  );

  t.is(
    await merged.entry.getString(),
    `# Hello

*   a
*   b

# Other
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

test("markdown merge into empty", async t => {
  const commit = await Markdown.merge(
    undefined,
    new EmptyContentEntry(FILE_NAME),
    new StringContentEntry(
      FILE_NAME,
      `# Hello
`
    )
  );

  t.is(commit.entry.name, FILE_NAME);
  t.is(
    await commit.entry.getString(),
    `# Hello
`
  );
});
