import MergeLineSet from './merge-line-set';

export default class MergeAndRemoveLineSet extends MergeLineSet {
  async mergeContent(context, original, template) {
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
      content,
      changed: content !== original,
      messages: [
        this.options.message || `chore: ${this.path} updated from template`
      ]
    };
  }
}
