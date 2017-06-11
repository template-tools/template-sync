export default class Client {
  constructor(files) {
    Object.defineProperty(this, 'files', {
      value: files
    });
  }

  repo(repo) {
    const c = this;
    return {
      contents(path, cb) {
        if (c.files[path][repo] === undefined) {
          cb(new Error(`missing ${path}`));
        } else {
          cb(undefined, {
            content: new Buffer(c.files[path][repo]).toString('base64')
          }, '', {});
        }
      }
    };
  }
}
