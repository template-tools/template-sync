/* global describe, it, xit, before, beforeEach, after, afterEach */
/* jslint node: true, esnext: true */

'use strict';

const assert = require('chai').assert;

import Context from '../src/Context';
import Travis from '../src/Travis';

import Client from './Client';

describe('merge travis', () => {
  describe('node versions', () => {
    describe('simple', () => {
      const context = new Context(new Client({
        'aFile': {
          templateRepo: `node_js:
  - 7.7.2
`,
          targetRepo: `node_js:
  - 7.7.1
`
        }
      }), 'targetRepo', 'templateRepo', {});

      const merger = new Travis(context, 'aFile');

      it('node_js versions', () =>
        merger.merge.then(m =>
          assert.equal(m.content, `node_js:
  - 7.7.2
`)));
    });
    describe('complex', () => {
      const context = new Context(new Client({
        'aFile': {
          templateRepo: `node_js:
  - 7.7.2
`,
          targetRepo: `node_js:
  - 6.10.1
  - 7.7.1
`
        }
      }), 'targetRepo', 'templateRepo', {});

      const merger = new Travis(context, 'aFile');

      it('node_js versions', () =>
        merger.merge.then(m =>
          assert.equal(m.content, `node_js:
  - 7.7.2
  - 6.10.1
`)));
    });
  });
});
