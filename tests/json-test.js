import test from 'ava';
import { Context } from '../src/context';
import { JSONFile } from '../src/json-file';
import { MockProvider } from 'mock-repository-provider';

const FILE_NAME = 'a.json';

async function createContext(template, target) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        [FILE_NAME]:
          template !== undefined ? JSON.stringify(template) : undefined
      }
    },
    targetRepo: {
      master: {
        [FILE_NAME]: target !== undefined ? JSON.stringify(target) : undefined
      }
    }
  });

  return new Context(
    await provider.branch('targetRepo'),
    await provider.branch('templateRepo'),
    {}
  );
}

test('json merge', async t => {
  const context = await createContext(
    {
      key: 'value'
    },
    {
      oldKey: 'oldValue'
    }
  );

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    key: 'value',
    oldKey: 'oldValue'
  });
});

test('json empty template', async t => {
  const context = await createContext(undefined, {
    oldKey: 'oldValue'
  });

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);

  t.is(merged, undefined);
});

test('json empty target', async t => {
  const context = await createContext(
    {
      key: 'value'
    },
    undefined
  );

  const json = new JSONFile(FILE_NAME);
  const merged = await json.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    key: 'value'
  });
});
