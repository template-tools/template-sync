/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import Readme from '../src/Readme';
import Package from '../src/Package';
import Client from './Client';

describe('readme', () => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `Line 1x
        Line 2x`,
      targetRepo: `Line 1

Line 2`
    },
    'package.json': {
      templateRepo: JSON.stringify({}),
      targetRepo: '{}'
    }
  }), 'targetRepo', 'templateRepo', {});

  context.addFile(new Package(context, 'package.json'));

  const readme = new Readme(context, 'aFile');

  it('lines', () =>
    readme.merge.then(m =>
      assert.equal(m.content, `
Line 2`)));
});
