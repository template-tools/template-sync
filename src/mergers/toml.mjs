import stringify from "@iarna/toml/stringify.js";
import parse from "@iarna/toml/parse-string.js";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, aggregateActions } from "../util.mjs";

export class TOML extends Merger {

  static get pattern() {
    return "**/*.toml";
  }

  static get defaultOptions() {
    return { ...super.defaultOptions, expand: false };
  }

  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, template) {
    if (template === "" || template === undefined) {
      return undefined;
    }

    const actions = {};

    const content = stringify(
      merge(
        parse(original) || {},
        parse(this.options.expand ? context.expand(template) : template)
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
