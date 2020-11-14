import test from "ava";
import { asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

const FILE_NAME = "a.md";

test("markdown merge", async t => {
  const commit = await asyncIterator2scalar(
    Markdown.commits(
      undefined,
      new StringContentEntry(
        FILE_NAME,
        `# Hello
* a
* b
`
      ),
      new StringContentEntry(FILE_NAME, `# Other`)
    )
  );

  t.is(
    await commit.entries[0].getString(),
    `# Hello

*   a
*   b

# Other
`
  );
});

test("markdown merge nop", async t => {
  const commit = await asyncIterator2scalar(
    Markdown.commits(
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
    )
  );

  t.is(commit, undefined);
});

test("markdown merge into empty", async t => {
  const commit = await asyncIterator2scalar(
    Markdown.commits(
      undefined,
      new EmptyContentEntry(FILE_NAME),
      new StringContentEntry(
        FILE_NAME,
        `# Hello
`
      )
    )
  );

  t.is(commit.entries[0].name, FILE_NAME);
  t.is(
    await commit.entries[0].getString(),
    `# Hello
`
  );
});
