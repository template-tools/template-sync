import MergeLineSet from './MergeLineSet';

export default class MergeAndRemoveLineSet extends MergeLineSet {
  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: true
      }),
      this.templateContent()
    ]).then(([original, template]) => {
      const toBeRemoved = new Set(
        template
          .split(/\n/)
          .filter(l => l.startsWith('- '))
          .map(l => l.replace(/^-\s+/, ''))
      );

      const result = new Set(
        template.split(/\n/).filter(l => !l.match(/^-\s+/))
      );
      original
        .split(/\n/)
        .filter(l => !toBeRemoved.has(l))
        .forEach(line => result.add(line));

      const content = Array.from(result.values()).join('\n');

      return {
        path: this.path,
        content,
        changed: content !== original,
        messages: [`${this.messageHead}: updated from template`]
      };
    });
  }
}
