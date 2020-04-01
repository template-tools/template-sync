import { JSONMerger } from './json.mjs';

export class JSDoc extends JSONMerger {
  static optionalDevDependencies(dependencies) {
    return new Set(Array.from(dependencies).filter(m => m.match(/babel-preset/)));
  }

  static async usedDevDependencies(entry) {
    const content = await entry.getString();
    const modules = new Set();

    const json = JSON.parse(content);

    if (json.babel !== undefined && json.babel.presets !== undefined) {
      json.babel.presets.forEach(m => modules.add(`babel-preset-${m}`));
    }

    return modules;
  }
}
