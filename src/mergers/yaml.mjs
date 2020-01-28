import yaml from "js-yaml";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2messages, aggregateActions } from "../util.mjs";

export class YAML extends Merger {

  static get pattern() {
    return "**/*.yaml";
  }

  static get defaultOptions() {
    return { ...super.defaultOptions, expand: false, messagePrefix: "chore: " };
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
      {
        lineWidth: 128
      }
    );

    return {
      content,
      changed: content !== original,
      messages: actions2messages(actions, this.options.messagePrefix, this.name)
    };
  }
}
