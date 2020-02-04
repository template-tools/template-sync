import { merge } from "hinted-tree-merger";
import { actions2messages, aggregateActions } from "../util.mjs";
import { Merger } from "../merger.mjs";

export class JSONMerger extends Merger {

  static get pattern() {
    return "**/*.json";
  }

  async mergeContent(context, original, template) {
    const actions = {};
  
    const content = JSON.stringify(
      merge(
        original === undefined || original.length === 0 ? {} : JSON.parse(original),
        JSON.parse(this.options.expand ? context.expand(template) : template)
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
