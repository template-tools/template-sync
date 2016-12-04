/* jslint node: true, esnext: true */

import File from './File';

export default class Replace extends File {
  get mergedContent() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const [original, template] = contents;
      return this.context.expand(template);
    });
  }
}
