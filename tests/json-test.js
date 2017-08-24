import test from 'ava';
import Context from '../src/context';
import JSONFile from '../src/json-file';
import Client from './client';

const FILE_NAME = 'a.json';

function createContext(template, target) {
  return new Context(
    new Client({
      [FILE_NAME]: {
        templateRepo:
          template !== undefined ? JSON.stringify(template) : undefined,
        targetRepo: target !== undefined ? JSON.stringify(target) : undefined
      }
    }),
    'targetRepo',
    'templateRepo',
    {}
  );
}

test('json merge', async t => {
  const context = createContext(
    {
      key: 'value'
    },
    {
      oldKey: 'oldValue'
    }
  );

  const json = new JSONFile(context, FILE_NAME);
  const merged = await json.merge;

  t.deepEqual(JSON.parse(merged.content), {
    key: 'value',
    oldKey: 'oldValue'
  });
});

test('json empty template', async t => {
  const context = createContext(undefined, {
    oldKey: 'oldValue'
  });

  const json = new JSONFile(context, FILE_NAME);
  const merged = await json.merge;

  t.is(merged, undefined);
});

test('json empty target', async t => {
  const context = createContext(
    {
      key: 'value'
    },
    undefined
  );

  const json = new JSONFile(context, FILE_NAME);
  const merged = await json.merge;

  t.deepEqual(JSON.parse(merged.content), {
    key: 'value'
  });
});
