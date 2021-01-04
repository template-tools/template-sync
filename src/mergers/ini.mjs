import { encode, decode } from "../ini-encoder.mjs";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

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
      destinationEntry.getString(),
      sourceEntry.getString()
    ]);

    const actions = {};

    const merged = encode(
      merge(
        decode(original),
        decode(options.expand ? context.expand(template) : template),
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
