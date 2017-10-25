import File from './file';

export default class JSONFile extends File {
  static matchesFileName(name) {
    return name.match(/\.json$/);
  }

  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, templateRaw) {
    if (templateRaw === '' || templateRaw === undefined) {
      return undefined;
    }

    const target =
      original === '' || original === undefined ? {} : JSON.parse(original);
    const template = JSON.parse(templateRaw);

    Object.assign(target, template);

    const content = JSON.stringify(context.expand(target), undefined, 2);

    return {
      content,
      changed: content !== original,
      messages: ['chore: update from template']
    };
  }
}
