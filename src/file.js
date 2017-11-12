export default class File {
  static matchesFileName(name) {
    return false;
  }

  constructor(path, options = {}) {
    Object.defineProperty(this, 'path', {
      value: path
    });

    Object.defineProperty(this, 'options', {
      value: options
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
      const result = await this.merge(context);
      if (result === undefined) {
        return {
          path: this.path,
          changed: false
        };
      }
      result.path = this.path;

      context.properties.path = this.path;
      result.messages = context.expand(result.messages);

      return result;
    } catch (err) {
      context.fail(`${context.targetRepo.name},${this.path}: ${err}`);
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
