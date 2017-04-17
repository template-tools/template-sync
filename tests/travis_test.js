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

test('travis node semver short', async t => {
  const context = new Context(new Client({
    'aFile': {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 5
`
    }
  }), 'targetRepo', 'templateRepo', {});

  const merger = new Travis(context, 'aFile');
  const merged = await merger.merge;
  t.deepEqual(merged.content, `node_js:
  - 7.7.2
  - 5
`);
});
