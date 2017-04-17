/* jslint node: true, esnext: true */

import File from './File';

export default class ReplaceIfEmpty extends File {
  get merge() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent({
      ignoreMissing: true
    })]).then(([original, template]) => {
      return original === '' ? {
        path: this.path,
        content: this.context.expand(template),
        changed: template !== '',
        message: `add missing ${this.path} from template`
      } : {
        path: this.path,
        content: original,
        changed: false,
        message: undefined
      };
    });
  }
}
