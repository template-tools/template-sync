/* jslint node: true, esnext: true */

import File from './File';

export default class ReplaceIfEmpty extends File {
  get merged() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent()]).then(contents => {
      const [original, template] = contents;

      return {
        path: this.path,
        content: original === '' ? this.context.expand(template) : original,
        changed: true,
        message: undefined
      };
    });
  }
}
