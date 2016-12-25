/* jslint node: true, esnext: true */

import File from './File';

export default class MergeLineSet extends File {
  get mergedContent() {
    return Promise.all([this.originalContent({
      ignoreMissing: true
    }), this.templateContent()]).then(contents => {
      const [original, template] = contents;

      const result = new Set(template.split(/\n/));
      original.split(/\n/).forEach(line => result.add(line));

      return Array.from(result.values()).join('\n');
    });
  }
}
