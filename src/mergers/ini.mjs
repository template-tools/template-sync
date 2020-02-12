import { encode, decode } from "../ini-encoder.mjs";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, actions2message, aggregateActions } from "../util.mjs";

export class INI extends Merger {

  static get pattern() {
    return "**/*.ini";
  }

  static get defaultOptions() {
    return { ...super.defaultOptions, expand: false };
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();

    const actions = {};
    
    return {
      message: actions2message(actions, options.messagePrefix, name),
      entry: new StringContentEntry(
        name,
        encode(
          merge(
            decode(original) || {},
            decode(
              options.expand ? context.expand(template) : template
            ),
            "",
            (action, hint) => aggregateActions(actions, action, hint),
            options.mergeHints
          )
        )
      )
    };
  }

  async mergeContent(context, original, template) {
    const actions = {};

    const content = encode(
      merge(
        decode(original) || {},
        decode(this.options.expand ? context.expand(template) : template)
      ),
      "",
      (action, hint) => aggregateActions(actions, action, hint),
      this.options.mergeHints
    );

    return {
      content,
      changed: content !== original,
      messages: actions2messages(actions, this.options.messagePrefix, this.name)
    };
  }
}
