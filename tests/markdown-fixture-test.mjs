import test from "ava";
import { FileSystemEntry } from "content-entry-filesystem";
import { Markdown } from "../src/mergers/markdown.mjs";

const here = new URL(`.`, import.meta.url).pathname;

export async function markdownt(t, factory, name) {
  const originalEntry = new FileSystemEntry(
    `fixtures/${name}-original.md`,
    here
  );

  const merged = await factory.merge(
    undefined,
    new FileSystemEntry(`fixtures/${name}-template.md`, here),
    originalEntry
  );

  const mergedEntry = new FileSystemEntry(`fixtures/${name}-merged.md`, here);

  if ((await mergedEntry.getString()) === (await originalEntry.getString())) {
    t.true(true);
  } else {
    t.is(await merged.entry.getString(), await mergedEntry.getString());
  }
}

markdownt.title = (providedTitle = "", factory, name) =>
  `${factory.name} ${providedTitle} ${name}`.trim();

test(markdownt, Markdown, "t1");
//test(markdownt, Markdown, "t2");
