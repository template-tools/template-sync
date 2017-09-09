import MergeLineSet from './merge-line-set';

export default class MergeAndRemoveLineSet extends MergeLineSet {
  async merge(context) {
    const [original, template] = await Promise.all([
      this.originalContent(context, {
        ignoreMissing: true
      }),
      this.templateContent(context)
    ]);

    const toBeRemoved = new Set(
      template
        .split(/\n/)
        .filter(l => l.startsWith('- '))
        .map(l => l.replace(/^-\s+/, ''))
    );

    const result = new Set(template.split(/\n/).filter(l => !l.match(/^-\s+/)));
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
  }
}
