import { JSONFile } from './json-file.mjs';

export class JSDoc extends JSONFile {
  optionalDevDependencies(dependencies) {
    return new Set(Array.from(dependencies).filter(m => m.match(/babel-preset/)));
  }

  usedDevDependencies(content) {
    const modules = new Set();

    const json = JSON.parse(content);

    if (json.babel !== undefined && json.babel.presets !== undefined) {
      json.babel.presets.forEach(m => modules.add(`babel-preset-${m}`));
    }

    return modules;
  }
}
