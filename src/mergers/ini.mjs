import { encode, decode } from "../ini-encoder.mjs";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, aggregateActions } from "../util.mjs";

export class INI extends Merger {

  static get pattern() {
    return "**/*.ini";
  }

  static get defaultOptions() {
    return { ...super.defaultOptions, expand: false };
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
