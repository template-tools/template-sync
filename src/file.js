export default class File {
  constructor(path) {
    Object.defineProperty(this, 'path', {
      value: path
    });
  }

  templateContent(context, options) {
    return this.content(context.templateRepo, this.path, options);
  }

  originalContent(context, options) {
    return this.content(context.targetRepo, this.path, options);
  }

  async merge(context) {
    return {
      path: this.path,
      changed: false,
      content: await this.originalContent(context)
    };
  }

  async saveMerge(context) {
    try {
      return this.merge(context);
    } catch (err) {
      console.log(`${this.path}: ${err}`);
      return {
        path: this.path,
        changed: false
      };
    }
  }

  async content(repository, path, options) {
    return repository.content(path, options);
  }
}
