/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert,
  ee = require('expression-expander');

import license from '../src/license';

describe('modify year', function () {

  const context = ee.createContext({
    keepUndefinedValues: true,
    leftMarker: '{{',
    rightMarker: '}}',
    markerRegexp: '\{\{([^\}]+)\}\}'
  });

  context.properties = {
    'date.year': 2016,
    owner: 'xyz'
  };

  const out = license('Copyright (c) 1999 by xyz', 'Copyright (c) {{date.year}} by {{owner}}', context, {});

  it('year range', function () {
    assert.equal(out, 'Copyright (c) 1999,2016 by xyz');
  });
});
