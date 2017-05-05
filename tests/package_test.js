/* jslint node: true, esnext: true */

'use strict';

import test from 'ava';
import Context from '../src/Context';
import Package from '../src/Package';
import Client from './Client';

const FILE_NAME = 'package.json';

function createContext(template, target) {
  return new Context(new Client({
      [FILE_NAME]: {
        templateRepo: template !== undefined ? JSON.stringify(template) : undefined,
        targetRepo: target !== undefined ? JSON.stringify(target) : undefined
      }
    }),
    'targetRepo',
    'templateRepo', {});
}

test('package devDependencies', async t => {
  const context = createContext({
    devDependencies: {
      apkg: '-',
      cpkg: '2.3.4'
    }
  }, {
    devDependencies: {
      apkg: '1.2.3',
      bpkg: '2.3.4'
    }
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  //console.log(merged.message);
  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    bpkg: '2.3.4',
    cpkg: '2.3.4'
  });
});

test('package devDependencies', async t => {
  const context = createContext({
    template: {
      keywords: {
        "_xxx_": "XXX"
      }
    }
  }, {
    name: 'abc_xxx_1'
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(merged.message, ['docs(package): add keyword XXX']);
  t.deepEqual(JSON.parse(merged.content).keywords, ['XXX']);
});
