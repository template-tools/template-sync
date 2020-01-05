import { mergeVersionsPreferNumeric } from "hinted-tree-merger";
import { YAML } from "./yaml.mjs";

export class Travis extends YAML {
  static matchesFileName(name) {
    return name === ".travis.yml";
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      messagePrefix: "chore(travis): ",
      mergeHints: {
        "*": { removeEmpty: true },
        "*node_js": { merge: mergeVersionsPreferNumeric },
        "jobs.include": {
          key: "stage"
        }
      }
    };
  }
}
