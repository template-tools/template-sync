import { stringify, parse } from "@yarnpkg/lockfile";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

export class YARNLockfile extends Merger {
  static get pattern() {
    return "yarn.lockfile";
  }

  static get options() {
    return {
      ...super.options,
      messagePrefix: "chore: "
    };
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();

    const actions = {};

    const merged = stringify(
      merge(
        parse(original).object,
        parse(template).object,
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      )
    );

    return original === merged
      ? undefined
      : {
          entry: new StringContentEntry(name, merged),
          message: actions2message(actions, options.messagePrefix, name)
        };
  }
}
