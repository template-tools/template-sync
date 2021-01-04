import { load, dump } from "js-yaml";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

export class YAML extends Merger {
  static get pattern() {
    return "**/*.yaml";
  }

  static get options() {
    return {
      ...super.options,
      expand: true,
      yaml: { lineWith: 128 /*schema: yaml.CORE_SCHEMA*/ },
      messagePrefix: "chore: "
    };
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const template = await sourceEntry.getString();
    const actions = {};

    const merged = dump(
      merge(
        load(original, options.yaml),
        load(
          options.expand ? context.expand(template) : template,
          options.yaml
        ),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      ),
      options.yaml
    );

    if (original !== merged) {
      yield {
        entries: [new StringContentEntry(name, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}
