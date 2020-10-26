import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { actions2message, aggregateActions } from "../util.mjs";
import { Merger } from "../merger.mjs";

export class JSONMerger extends Merger {
  static get pattern() {
    return "**/*.json";
  }

  static get options() {
    return {
      ...super.options,
      replacer: undefined,
      space: 2
    };
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();

    const actions = {};

    const merged = JSON.stringify(
      merge(
        original.length === 0 ? {} : JSON.parse(original),
        JSON.parse(options.expand ? context.expand(template) : template),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      ),
      options.replacer,
      options.space
    );

    return merged === original
      ? undefined
      : {
          entry: new StringContentEntry(name, merged),
          message: actions2message(actions, options.messagePrefix, name)
        };
  }
}
