/* jslint node: true, esnext: true */

import File from './File';

export default class ReplaceIfEmpty extends File {
  get mergedContent() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent()]).then(contents => {
      const [original, template] = contents;
      return original === '' ? this.context.expand(template) : original;
    });
  }
}
