import { File } from './file';

export class MergeLineSet extends File {
  async mergeContent(context, original, template) {
    const result = new Set(template.split(/\n/));
    original.split(/\r?\n/).forEach(line => result.add(line));

    const content = Array.from(result.values()).join('\n');

    return {
      content,
      changed: content !== original,
      messages: [this.options.message || 'fix: updated from template']
    };
  }
}
