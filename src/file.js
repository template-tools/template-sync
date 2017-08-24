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
    return this.getContent(this.context.templateRepo, this.path, options);
  }

  originalContent(options) {
    return this.getContent(this.context.targetRepo, this.path, options);
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

  getContent(repo, path, options = {}) {
    return new Promise((resolve, reject) =>
      this.context.client.repo(repo).contents(path, (err, status, body) => {
        if (err) {
          if (options.ignoreMissing) {
            resolve('');
          } else {
            reject(new Error(`${path}: ${err}`));
          }
        } else {
          const b = Buffer.from(status.content, 'base64');
          resolve(b.toString());
        }
      })
    );
  }
}
