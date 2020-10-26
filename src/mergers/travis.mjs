import { mergeVersionsPreferNumeric } from "hinted-tree-merger";
import { YAML } from "./yaml.mjs";

export class Travis extends YAML {
  static get pattern() {
    return ".travis.yml";
  }

  static get options() {
    return {
      ...super.options,
      messagePrefix: "chore(travis): ",
      mergeHints: {
        "*": { scope: "travis", removeEmpty: true },
        "": {
          orderBy: [
            "dist",
            "arch",
            "group",
            "os",
            "language",
            "addons",
            "python",
            "php",
            "rvm",
            "node_js",
            "env",
            "install",
            "jobs",
            "before_script",
            "after_script",
            "script",
            "branches",
            "notifications"
          ]
        },
        "*node_js": { merge: mergeVersionsPreferNumeric },
        "jobs.include": {
          key: "stage",
          orderBy: ["test", "lint", "doc", "release"]
        } /*,
        "*stage": {
          orderBy: ["node_js", "script"]
        }*/
      }
    };
  }
}
