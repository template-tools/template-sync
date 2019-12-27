import { File } from "./file.mjs";
import stringify from '@iarna/toml/stringify.js';
import parse from '@iarna/toml/parse-string.js';
import { merge } from "hinted-tree-merger";

export class TOML extends File {
  static matchesFileName(name) {
    return name.match(/\.toml$/);
  }

  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, templateRaw) {
    if (templateRaw === "" || templateRaw === undefined) {
      return undefined;
    }

    const messagePrefix = 'chore(toml):';
    const actions = {};

    const content = stringify(
      merge(
        parse(original) || {},
        context.expand(parse(templateRaw))),
        "",
        action => {
          if (actions[action.path] === undefined) {
            actions[action.path] = [action];
          } else {
            actions[action.path].push(action);
          }
          delete action.path;
        }
      );
  

    const messages = Object.keys(actions).map(slot => {
      const a = actions[slot];

      const toValue = s => s !== undefined && isScalar(s) ? s : undefined;
      const add = a.map(x => toValue(x.add)).filter(x => x !== undefined);
      const remove = a.map(x => toValue(x.remove)).filter(x => x !== undefined);

      return messagePrefix +
          (add.length ? ` add ${add}` : "") +
          (remove.length ? ` remove ${remove}` : "") +
          ` (${slot.replace(/\[\d*\]/, "")})`;
    });

    if (messages.length === 0) {
      messages.push(`${messagePrefix} merge from template ${this.name}`);
    }

    return {
      content,
      changed: content !== original,
      messages
    };
  }
}
