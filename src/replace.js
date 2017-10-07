import File from './file';

export default class Replace extends File {
  async mergeContent(context, original, template) {
    const content = context.expand(template);

    return {
      content,
      changed: content !== original,
      messages: [`chore: ${this.path} overwritten from template`]
    };
  }
}
