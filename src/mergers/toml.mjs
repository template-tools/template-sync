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
    const [original, template] = await Promise.all([
      destinationEntry.string,
      sourceEntry.string
    ]);

    const actions = {};

    const merged = stringify(
      merge(
        parse(context.expand(original, options.expand)) || {},
        parse(context.expand(template, options.expand)),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      )
    );

    if (merged !== original) {
      const name = destinationEntry.name;

      yield {
        message: actions2message(actions, options.messagePrefix, name),
        entries: [new StringContentEntry(name,merged)]
      };
    }
  }
}
