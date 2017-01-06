/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import MergeLineSet from '../src/MergeLineSet';

import Client from './Client';

describe('merge lines', () => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: ['Line 1', 'Line 2'].join('\n'),
      targetRepo: ['Line 1', 'Line 3'].join('\n')
    }
  }), 'targetRepo', 'templateRepo', {});

  const merger = new MergeLineSet(context, 'aFile');

  it('lines', () =>
    merger.merge.then(m =>
      assert.equal(m.content, ['Line 1', 'Line 2', 'Line 3'].join('\n'))));
});
