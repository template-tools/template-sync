import { mergeVersionsPreferNumeric } from "hinted-tree-merger";
import { YAML } from "./yaml.mjs";

export class Travis extends YAML {
  static get pattern() {
    return ".travis.yml";
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      messagePrefix: "chore(travis): ",
      mergeHints: {
        "*": { scope: "travis", removeEmpty: true },
        "*node_js": { merge: mergeVersionsPreferNumeric },
        "jobs.include": {
          key: "stage",
          orderBy: ["test", "doc", "release"]
        }/*,
        "*stage": {
          orderBy: ["node_js", "script"]
        }*/
      }
    };
  }
}
