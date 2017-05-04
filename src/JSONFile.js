/* jslint node: true, esnext: true */

import File from './File';

export default class JSONFile extends File {
  get merge() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent({
      ignoreMissing: true
    })]).then(([original, templateRaw]) => {
      if (templateRaw === '') {
        return undefined;
      }

      const target = JSON.parse(original);
      const template = JSON.parse(templateRaw);

      Object.assign(target, template);

      const content = JSON.stringify(this.context.expand(target), undefined, 2);

      return {
        path: this.path,
        content: content,
        changed: content != original,
        message: 'fix: updated set from template'
      };
    });
  }
}
