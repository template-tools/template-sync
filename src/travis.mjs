import yaml from "js-yaml";
import { mergeVersionsPreferNumeric, merge, isScalar } from "hinted-tree-merger";
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
        "",
        action => {
          if (actions[action.path] === undefined) {
            actions[action.path] = [action];
          } else {
            actions[action.path].push(action);
          }
          delete action.path;
        },
        {
          "*": { removeEmpty: true },
          "*node_js": { merge: mergeVersionsPreferNumeric },
          node_js: { merge: mergeVersionsPreferNumeric },
          "jobs.include": {
            key: "stage"
          }
        }
      ),
      {
        lineWidth: 128
      }
    );

    const messages = Object.keys(actions).map(slot => {
      const a = actions[slot];

      const toValue = s => s !== undefined && isScalar(s) ? s : undefined;
      const add = a.map(x => toValue(x.add)).filter(x => x !== undefined);
      const remove = a.map(x => toValue(x.remove)).filter(x => x !== undefined);

      return "chore(travis):" +
          (add.length ? ` add ${add}` : "") +
          (remove.length ? ` remove ${remove}` : "") +
          ` (${slot.replace(/\[\d*\]/, "")})`;
    });

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
