import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import {
  actions2message,
  aggregateActions
} from "../util.mjs";
import { Merger } from "../merger.mjs";

export class JSONMerger extends Merger {
  static get pattern() {
    return "**/*.json";
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      replacer: undefined,
      space: 2
    };
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const name = destinationEntry.name;
    const original = (await destinationEntry.isEmpty()) ? {} : JSON.parse(await destinationEntry.getString());
    const template = await sourceEntry.getString();

    const actions = {};

    return {
      message: actions2message(actions, options.messagePrefix, name),
      entry: new StringContentEntry(
        name,
        JSON.stringify(
          merge(
            original,
            JSON.parse(options.expand ? context.expand(template) : template),
            "",
            (action, hint) => aggregateActions(actions, action, hint),
            options.mergeHints
          ),
          options.replacer,
          options.space
        )
      )
    };
  }
}
