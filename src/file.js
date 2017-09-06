export default class File {
  constructor(context, path) {
    Object.defineProperty(this, 'context', {
      value: context
    });

    Object.defineProperty(this, 'path', {
      value: path
    });

    context.addFile(this);
  }

  templateContent(options) {
    return this.content(this.context.templateRepo, this.path, options);
  }

  originalContent(options) {
    return this.content(this.context.targetRepo, this.path, options);
  }

  get merge() {
    return this.originalContent().then(content =>
      Promise.resolve({
        path: this.path,
        changed: false,
        content
      })
    );
  }

  async content(repository, path, options) {
    return repository.content(path, options);
  }
}
