/* jslint node: true, esnext: true */

import File from './File';

export default class ReplaceIfEmpty extends File {
  get merged() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent()]).then(([original, template]) => {
      return original === '' ? {
        path: this.path,
        content: this.context.expand(template),
        changed: true,
        message: `insert missing ${this.path} from template`
      } : {
        path: this.path,
        content: original,
        changed: false,
        message: undefined
      };
    });
  }
}
