import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, actions2message, aggregateActions } from "../util.mjs";

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
    
    return {
      message: actions2message(actions, options.messagePrefix, name),
      entry: new StringContentEntry(
        name,
        set2lines(
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
        )
      )
    };
  }

  async mergeContent(context, original, template) {
    const actions = {};
    const ignore = new Set(this.options.defaultIgnore);

    const content = set2lines(
      merge(lines2set(original), [
        ...lines2set(this.options.expand ? context.expand(template) : template),
        ...[...ignore].map(p => `-${p}`)
      ]),
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
