/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import License from '../src/License';

describe('modify year', () => {

  const context = new Context(undefined, '', '', {
    'date.year': 2016,
    owner: 'xyz'
  }, {
    'aFile': {
      template: 'Copyright (c) {{date.year}} by {{owner}}',
      content: 'Copyright (c) 1999 by xyz'
    }
  });

  const license = new License(context, 'aFile');

  it('year range', () => {
    assert.equal(license.mergedContent, 'Copyright (c) 1999,2016 by xyz');
  });
});
