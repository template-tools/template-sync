/* jslint node: true, esnext: true */

import File from './File';

export default class Replace extends File {
  get merge() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const [original, template] = contents;

      return {
        path: this.path,
        content: this.context.expand(template),
        changed: true,
        message: undefined
      };
    });
  }
}
