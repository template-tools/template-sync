export default class File {
  static matchesFileName(name) {
    return false;
  }

  constructor(path) {
    Object.defineProperty(this, 'path', {
      value: path
    });
  }

  get needsTemplate() {
    return true;
  }

  get needsOriginal() {
    return false;
  }

  optionalDevModules(modules) {
    return new Set();
  }

  usedDevModules(content) {
    return new Set();
  }

  templateContent(context, options) {
    return this.content(context.templateRepo, this.path, options);
  }

  originalContent(context, options) {
    return this.content(context.targetRepo, this.path, options);
  }

  async mergeContent(context, original, template) {
    return {
      changed: false,
      content: original
    };
  }

  async merge(context) {
    const [original, template] = await Promise.all([
      this.originalContent(context, {
        ignoreMissing: !this.needsOriginal
      }),
      this.templateContent(context, {
        ignoreMissing: !this.needsTemplate
      })
    ]);

    return this.mergeContent(context, original, template);
  }

  async saveMerge(context) {
    try {
      return this.merge(context);
    } catch (err) {
      context.fail(`${this.name},${this.path}: ${err}`);
      return {
        changed: false
      };
    }
  }

  async content(repository, path, options) {
    return repository.content(path, options);
  }
}
