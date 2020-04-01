import yaml from "js-yaml";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

export class YAML extends Merger {
  static get pattern() {
    return "**/*.yaml";
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      expand: true,
      yaml: { lineWith: 128 },
      messagePrefix: "chore: "
    };
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

    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };
    const actions = {};

    return {
      entry: new StringContentEntry(
        name,
        yaml.safeDump(
          merge(
            yaml.safeLoad(original, ymlOptions) || {},
            yaml.safeLoad(
              options.expand ? context.expand(template) : template,
              ymlOptions
            ),
            "",
            (action, hint) => aggregateActions(actions, action, hint),
            options.mergeHints
          ),
          options.yaml
        )
      ),
      message: actions2message(actions, options.messagePrefix, name)
    };
  }
}
