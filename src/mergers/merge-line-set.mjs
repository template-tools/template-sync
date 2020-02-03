import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, aggregateActions } from "../util.mjs";

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
  /**
   * entries to be skipped from result
   * @return {Set<string>}
   */
  get defaultIgnoreSet() {
    return new Set([""]);
  }

  async mergeContent(context, original, template) {
    const actions = {};

    const content = set2lines(
      merge(lines2set(original), [
        ...lines2set(this.options.expand ? context.expand(template) : template),
        ...[...this.defaultIgnoreSet].map(p => `-${p}`)
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
