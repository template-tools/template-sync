/* jslint node: true, esnext: true */

import File from './File';

export default class MergeLineSet extends File {
  get merge() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent()]).then(contents => {
      const [original, template] = contents;

      const result = new Set(template.split(/\n/));
      original.split(/\n/).forEach(line => result.add(line));

      return {
        path: this.path,
        content: Array.from(result.values()).join('\n'),
        changed: true,
        message: undefined
      };
    });
  }
}
