/* jslint node: true, esnext: true */

'use strict';

import test from 'ava';
import Context from '../src/Context';
import Package from '../src/Package';
import Client from './Client';

test('package', async t => {

  const context = new Context(new Client({
      'package.json': {
        templateRepo: JSON.stringify({
          devDependencies: {
            apkg: '-',
            cpkg: '2.3.4'
          }
        }),
        targetRepo: JSON.stringify({
          devDependencies: {
            apkg: '1.2.3',
            bpkg: '2.3.4'
          }
        })
      }
    }),
    'targetRepo',
    'templateRepo', {});

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  console.log(merged.message);
  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    bpkg: '2.3.4',
    cpkg: '2.3.4'
  });
});
