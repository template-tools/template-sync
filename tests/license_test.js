/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

import {
  expect, assert
}
from 'chai';
import {
  license
}
from '../tmp/bundle.test.js';

describe('modify year', function () {
  const out = license.merger('Copyright (c) 1999 by xyz', 'Copyright (c) {{date.year}} by {{owner}}', {
    'date.year': 2016,
    owener: 'owner'
  });

  it('year range', function () {
    assert.match(out, 'Copyright (c) 1999-2016 by xyz');
  });
});
