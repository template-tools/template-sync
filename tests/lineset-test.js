import test from 'ava';
import Context from '../src/context';
import MergeLineSet from '../src/merge-line-set';
import Client from './client';

test('merge lines', async t => {
  const context = new Context(
    new Client({
      aFile: {
        templateRepo: ['Line 1', 'Line 2'].join('\n'),
        targetRepo: ['Line 1', 'Line 3'].join('\n')
      }
    }),
    'targetRepo',
    'templateRepo',
    {}
  );

  const merger = new MergeLineSet(context, 'aFile');
  const merged = await merger.merge;
  t.deepEqual(merged.content, ['Line 1', 'Line 2', 'Line 3'].join('\n'));
  t.true(merged.messages.includes('fix: updated from template'));
});
