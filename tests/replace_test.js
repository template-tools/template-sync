/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import Replace from '../src/Replace';

import Client from './Client';

describe('replace', () => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `Line 1x
        Line 2x`,
      targetRepo: `Line 1
        Line 2`
    }
  }), 'targetRepo', 'templateRepo', {});

  const readme = new Replace(context, 'aFile');

  it('lines', () =>
    readme.mergedContent.then(c =>
      assert.equal(c, `Line 1x
        Line 2x`)));
});
