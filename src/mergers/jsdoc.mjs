import { JSONMerger } from "./json.mjs";

export class JSDoc extends JSONMerger {
  static get options() {
    return {
      ...super.options,
      messagePrefix: "chore(jsdoc): ",
    optionalDevDependencies: [/babel\-preset\-.*/]
    };
  }

  static async usedDevDependencies(into, entry) {
    const content = await entry.string;

    const json = JSON.parse(content);

    if (json.babel !== undefined && json.babel.presets !== undefined) {
      json.babel.presets.forEach(m => into.add(`babel-preset-${m}`));
    }

    return into;
  }
}
