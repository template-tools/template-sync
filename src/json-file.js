import File from './file';

export default class JSONFile extends File {
  async merge(context) {
    const [original, templateRaw] = await Promise.all([
      this.originalContent(context, {
        ignoreMissing: true
      }),
      this.templateContent(context, {
        ignoreMissing: true
      })
    ]);

    if (templateRaw === '' || templateRaw === undefined) {
      return undefined;
    }

    const target =
      original === '' || original === undefined ? {} : JSON.parse(original);
    const template = JSON.parse(templateRaw);

    Object.assign(target, template);

    const content = JSON.stringify(context.expand(target), undefined, 2);

    return {
      path: this.path,
      content,
      changed: content !== original,
      messages: ['fix: updated set from template']
    };
  }
}
