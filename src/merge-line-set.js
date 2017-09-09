import File from './file';

export default class MergeLineSet extends File {
  constructor(path, messageHead = 'fix') {
    super(path);
    Object.defineProperty(this, 'messageHead', {
      value: messageHead
    });
  }

  async mergeContent(context, original, template) {
    const result = new Set(template.split(/\n/));
    original.split(/\n/).forEach(line => result.add(line));

    const content = Array.from(result.values()).join('\n');

    return {
      path: this.path,
      content,
      changed: content !== original,
      messages: [`${this.messageHead}: updated from template`]
    };
  }
}
