import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { FileSystemEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export async function markdownt(t, factory, name) {
  const merged = await factory.merge(
    undefined,
    new FileSystemEntry(join("fixtures", `${name}-template.md`), here),
    new FileSystemEntry(join("fixtures", `${name}-original.md`), here)
  );

  t.is(merged, undefined);
  /*
  const fm = new FileSystemEntry(join("fixtures", `${name}-merged.md`), here);
  t.is(await merged.entry.getString(), await fm.getString());
  */
}

markdownt.title = (providedTitle = "", factory, name) =>
  `${factory.name} ${providedTitle} ${name}`.trim();

test(markdownt, Markdown, "t1");
