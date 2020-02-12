import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { actions2messages, actions2message, aggregateActions } from "../util.mjs";
import { Merger } from "../merger.mjs";

export class JSONMerger extends Merger {

  static get pattern() {
    return "**/*.json";
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = YAML.defaultOptions
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();

    const actions = {};
    
    return {
      message: actions2message(actions, options.messagePrefix, name),
      entry: new StringContentEntry(
        name,
        yaml.safeDump(
          merge(
            JSON.parse(original) || {},
            JSON.parse(
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
