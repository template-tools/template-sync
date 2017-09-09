import File from './file';

export default class Replace extends File {
  async merge(context) {
    const [original, template] = await Promise.all([
      this.originalContent(context),
      this.templateContent(context)
    ]);

    const content = context.expand(template);

    return {
      path: this.path,
      content,
      changed: content !== original,
      messages: [`chore: ${this.path} overwritten from template`]
    };
  }
}
