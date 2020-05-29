import { JSONMerger } from "./json.mjs";

export class JSDoc extends JSONMerger {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      messagePrefix: "chore(jsdoc): ",
    optionalDevDependencies: [/babel\-preset\-.*/]
    };
  }

  static async usedDevDependencies(into, entry) {
    const content = await entry.getString();

    const json = JSON.parse(content);

    if (json.babel !== undefined && json.babel.presets !== undefined) {
      json.babel.presets.forEach(m => into.add(`babel-preset-${m}`));
    }

    return into;
  }
}
