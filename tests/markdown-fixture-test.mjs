import test from "ava";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { FileSystemEntry } from "content-entry";
import { Markdown } from "../src/mergers/markdown.mjs";

const here = dirname(fileURLToPath(import.meta.url));

export async function markdownt(t, factory, name) {
  const merged = await factory.merge(
    undefined,
    new FileSystemEntry(`fixtures/${name}-template.md`, here),
    new FileSystemEntry(`fixtures/${name}-original.md`, here)
  );

  const fm = new FileSystemEntry(`fixtures/${name}-merged.md`, here);

  t.is(await merged.entry.getString(), await fm.getString());
}

markdownt.title = (providedTitle = "", factory, name) =>
  `${factory.name} ${providedTitle} ${name}`.trim();

test.skip(markdownt, Markdown, "t1");
