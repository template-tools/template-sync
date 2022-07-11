import { encode, decode } from "../ini-encoder.mjs";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

/**
 * Merge ini entries
 */
export class INI extends Merger {
  static get pattern() {
    return "**/*.ini";
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

    const merged = encode(
      merge(
        decode(original),
        decode(context.expand(template, options.expand)),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      )
    );

    if (original !== merged) {
      const name = destinationEntry.name;

      yield {
        entries: [new StringContentEntry(name, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}
