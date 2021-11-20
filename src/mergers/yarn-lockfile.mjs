import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

//import { stringify, parse } from "@yarnpkg/lockfile";

import lockfile from "@yarnpkg/lockfile";
const { stringify, parse } = lockfile;

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

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const [original, template] = await Promise.all([
      destinationEntry.string,
      sourceEntry.string
    ]);

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

    if (original !== merged) {
      const name = destinationEntry.name;

      yield {
        entries: [new StringContentEntry(name, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}
