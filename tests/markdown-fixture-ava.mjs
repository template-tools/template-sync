import test from "ava";
import { asyncIterator2scalar } from "./helpers/util.mjs";
import { FileSystemEntry } from "content-entry-filesystem";
import { Markdown } from "../src/mergers/markdown.mjs";

const here = new URL(".", import.meta.url).pathname;

export async function markdownt(t, factory, name) {
  const mergedEntry = new FileSystemEntry(`fixtures/${name}-merged.md`, here);
  const templateEntry = new FileSystemEntry(
    `fixtures/${name}-template.md`,
    here
  );
  const originalEntry = new FileSystemEntry(
    `fixtures/${name}-original.md`,
    here
  );

  const merged = await asyncIterator2scalar(
    factory.commits(undefined, templateEntry, originalEntry)
  );

  console.log(
    "<<<",
    await templateEntry.string,
    "---",
    await mergedEntry.string,
    "---",
    await originalEntry.string,
    ">>>"
  );

  if ((await mergedEntry.string) === (await originalEntry.string)) {
    t.true(true);
  } else {
    t.is(await merged.entry.string, await mergedEntry.string);
  }
}

markdownt.title = (providedTitle = "", factory, name) =>
  `${factory.name} ${providedTitle} ${name}`.trim();

test.skip(markdownt, Markdown, "t1");
//test(markdownt, Markdown, "t2");
