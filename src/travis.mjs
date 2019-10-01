import yaml from "js-yaml";
import { mergeVersionsPreferNumeric, merge } from "hinted-tree-merger";
import { File } from "./file.mjs";

export class Travis extends File {
  static matchesFileName(name) {
    return name === ".travis.yml";
  }

  async mergeContent(context, original, template) {
    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };

    const actions = {};

    const content = yaml.safeDump(
      merge(
        yaml.safeLoad(original, ymlOptions) || {},
        yaml.safeLoad(context.expand(template), ymlOptions),
        '',
        action => {
          if (actions[action.path] === undefined) {
            actions[action.path] = [action];
          } else {
            actions[action.path].push(action);
          }
          delete action.path;
        },
        {
          "": { removeEmpty: true },
          cache: { removeEmpty: true },
          script: { removeEmpty: true },
          node_js: { removeEmpty: true },
          jobs: { removeEmpty: true },
          before_script: { removeEmpty: true },
          after_script: { removeEmpty: true },
          after_success: { removeEmpty: true },
          notifications: { removeEmpty: true },
          node_js: mergeVersionsPreferNumeric,
          "jobs.include": {
            removeEmpty: true,
            key: "stage"
          }
        }
          ),
      {
        lineWidth: 128
      }
    );

    const messages = [];

    for (const slot of Object.keys(actions)) {
      const a = actions[slot];

      const add = a.filter(x => x.add).map(x => x.add);
      const remove = a.filter(x => x.remove).map(x => x.remove);

      messages.push(
        "chore(travis):" +
          (add.length ? ` add ${add}` : "") +
          (remove.length ? ` remove ${remove}` : "") +
          ` (${slot.replace(/\[\d+\]/,'')})`
      );
    }

    if (messages.length === 0) {
      messages.push(`chore(travis): merge from template ${this.name}`);
    }

    return {
      content,
      changed: content !== original,
      messages
    };
  }
}
