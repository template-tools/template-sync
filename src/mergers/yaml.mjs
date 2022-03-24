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
    const [original, template] = await Promise.all([
      destinationEntry.string,
      sourceEntry.string
    ]);
    const actions = {};

    const merged = dump(
      merge(
        load(context.expand(original, options.expand), options.yaml),
        load(context.expand(template, options.expand), options.yaml),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      ),
      options.yaml
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