/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import License from '../src/License';


class Client {
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

describe('modify year', () => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: 'Copyright (c) {{date.year}} by {{owner}}',
      targetRepo: 'Copyright (c) 1999 by xyz'
    }
  }), 'targetRepo', 'templateRepo', {
    'date.year': 2099,
    owner: 'xyz'
  });

  const license = new License(context, 'aFile');

  it('year range', () =>
    license.mergedContent.then(c =>
      assert.equal(c, 'Copyright (c) 1999,2099 by xyz')));
});
