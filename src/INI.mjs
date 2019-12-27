import { encode, decode } from "./ini-encoder.mjs";
import { merge } from "hinted-tree-merger";
import { File } from "./file.mjs";
import { actions2messages } from "./util.mjs";

export class INI extends File {
  static matchesFileName(name) {
    return name.match(/\.ini$/);
  }

  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, templateRaw) {
    if (templateRaw === "" || templateRaw === undefined) {
      return undefined;
    }

    const actions = {};

    const content = encode(
      merge(decode(original) || {}, decode(context.expand(templateRaw))),
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

    return {
      content,
      changed: content !== original,
      messages: actions2messages(actions, "chore(ini):", this.name)
    };
  }
}
