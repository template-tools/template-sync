/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

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
        cb(undefined, {
          content: new Buffer(c.files[path][repo]).toString('base64')
        }, '', {});
      }
    };
  }
}
