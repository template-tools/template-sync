import { JSONFile } from './json-file';

export class JSDoc extends JSONFile {
  optionalDevModules(modules) {
    return new Set(Array.from(modules).filter(m => m.match(/babel-preset/)));
  }

  usedDevModules(content) {
    const modules = new Set();

    const json = JSON.parse(content);

    if (json.babel !== undefined && json.babel.presets !== undefined) {
      json.babel.presets.forEach(m => modules.add(`babel-preset-${m}`));
    }

    return modules;
  }
}
