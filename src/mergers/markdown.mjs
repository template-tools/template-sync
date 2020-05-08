import unified from "unified";
import markdown from "remark-parse";
import stringify from "remark-stringify";
import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";
import { actions2message } from "../util.mjs";

export class Markdown extends Merger {
  static get pattern() {
    return "**/*.md";
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();

    const actions = {};

    const templateTree = unified().use(markdown).parse(await sourceEntry.getString());
    const originalTree = unified().use(markdown).parse(original);

    //console.log(originalTree);

    const merged = unified().use(markdown).use(stringify).stringify(templateTree);

    return merged === original
      ? undefined
      : {
          message: actions2message(actions, options.messagePrefix, name),
          entry: new StringContentEntry(name, merged)
        };
  }
}
