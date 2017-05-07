/* jslint node: true, esnext: true */

'use strict';

import test from 'ava';
import Context from '../src/Context';
import Travis from '../src/Travis';
import Client from './Client';

test('travis node versions simple', async t => {
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
  const merged = await merger.merge;

  t.deepEqual(merged.content, `node_js:
  - 7.7.2
`);
});

test('travis node versions complex', async t => {
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
  const merged = await merger.merge;
  t.deepEqual(merged.content, `node_js:
  - 7.7.2
  - 6.10.1
`);
});

test('travis node semver mayor only', async t => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 5
  - 6.2
`
    }
  }), 'targetRepo', 'templateRepo', {});

  const merger = new Travis(context, 'aFile');
  const merged = await merger.merge;
  t.deepEqual(merged.content, `node_js:
  - 7.7.2
  - 5
  - 6.2
`);
});

test('travis node semver remove', async t => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `node_js:
  - -4
  - 7.7.2
`,
      targetRepo: `node_js:
  - 4.2
  - 4.2.3
`
    }
  }), 'targetRepo', 'templateRepo', {});

  const merger = new Travis(context, 'aFile');
  const merged = await merger.merge;
  t.deepEqual(merged.content, `node_js:
  - 7.7.2
`);
});

test('start fresh', async t => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: ''
    }
  }), 'targetRepo', 'templateRepo', {});

  const merger = new Travis(context, 'aFile');
  const merged = await merger.merge;
  t.deepEqual(merged.content, `node_js:
  - 7.7.2
`);
});
