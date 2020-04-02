import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

function lines2set(content) {
  return new Set(content.split(/\r?\n/));
}

function set2lines(values) {
  return Array.from(values).join("\n");
}

/**
 *
 */
export class MergeLineSet extends Merger {
  static get defaultOptions() {
    return { ...super.defaultOptions, defaultIgnore: [""] };
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
    const ignore = new Set(options.defaultIgnore);

    const actions = {};

    const merged = set2lines(
      merge(
        lines2set(original),
        [
          ...lines2set(options.expand ? context.expand(template) : template),
          ...[...ignore].map(p => `-${p}`)
        ],
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      )
    );

    return merged === original
      ? undefined
      : {
          entry: new StringContentEntry(name, merged),
          message: actions2message(actions, options.messagePrefix, name)
        };
  }
}
