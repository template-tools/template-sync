import stringify from "@iarna/toml/stringify.js";
import parse from "@iarna/toml/parse-string.js";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

export class TOML extends Merger {
  static get pattern() {
    return "**/*.toml";
  }

  static get options() {
    return { ...super.options, expand: false };
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();

    const actions = {};

    yield {
      message: actions2message(actions, options.messagePrefix, name),
      entries: [new StringContentEntry(
        name,
        stringify(
          merge(
            parse(options.expand ? context.expand(original) : original) || {},
            parse(options.expand ? context.expand(template) : template),
            "",
            (action, hint) => aggregateActions(actions, action, hint),
            options.mergeHints
          )
        )
      )]
    };
  }
}
