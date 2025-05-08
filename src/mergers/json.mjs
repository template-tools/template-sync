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

    const merged = JSON.stringify(
      merge(
        original.length === 0 ? {} : JSON.parse(original),
        JSON.parse(context.expand(template, options.expand)),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      ),
      options.replacer,
      options.space
    );

    if (merged !== original) {
      const name = destinationEntry.name;

      yield {
        entries: [new StringContentEntry(name, undefined, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}
