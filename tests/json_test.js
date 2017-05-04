/* jslint node: true, esnext: true */

'use strict';

import test from 'ava';
import Context from '../src/Context';
import JSONFile from '../src/JSONFile';
import Client from './Client';

test('json', async t => {
  const context = new Context(new Client({
      'a.json': {
        templateRepo: JSON.stringify({
          key: 'value'
        }),
        targetRepo: JSON.stringify({
          oldKey: 'oldValue'
        })
      }
    }),
    'targetRepo',
    'templateRepo', {});

  const json = new JSONFile(context, 'a.json');
  const merged = await json.merge;

  t.deepEqual(JSON.parse(merged.content), {
    key: 'value',
    oldKey: 'oldValue'
  });
});
