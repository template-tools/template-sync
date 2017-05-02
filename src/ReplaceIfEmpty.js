/* jslint node: true, esnext: true */

import File from './File';

export default class ReplaceIfEmpty extends File {

  constructor(context, path, message) {
    super(context, path);

    Object.defineProperty(this, 'message', {
      value: message
    });
  }

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
        message: this.message === undefined ? `chore: add missing ${this.path} from template` : this.message
      } : {
        path: this.path,
        content: original,
        changed: false,
        message: undefined
      };
    });
  }
}
