import yaml from "js-yaml";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import {
  actions2messages,
  actions2message,
  aggregateActions
} from "../util.mjs";

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
      message: actions2message(actions, options.messagePrefix, name),
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
      )
    };
  }

  async mergeContent(context, original, template) {
    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };
    const actions = {};

    const content = yaml.safeDump(
      merge(
        yaml.safeLoad(original, ymlOptions) || {},
        yaml.safeLoad(
          this.options.expand ? context.expand(template) : template,
          ymlOptions
        ),
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        this.options.mergeHints
      ),
      this.options.yaml
    );

    return {
      content,
      changed: content !== original,
      messages: actions2messages(actions, this.options.messagePrefix, this.name)
    };
  }
}
