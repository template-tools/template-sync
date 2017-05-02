/* jslint node: true, esnext: true */

import File from './File';

export default class Replace extends File {
  get merge() {
    return Promise.all([this.originalContent(), this.templateContent()])
      .then(([original, template]) => {
        const content = this.context.expand(template);

        return {
          path: this.path,
          content: content,
          changed: content !== original,
          message: `chore: ${this.path} overwritten from template`
        };
      });
  }
}
