import test from 'ava';
import { MockProvider } from 'mock-repository-provider';

import { Context } from '../src/context.mjs';
import { PreparedContext } from '../src/prepared-context.mjs';
import { TOML } from '../src/toml.mjs';
import stringify from '@iarna/toml/stringify.js';
import parse from '@iarna/toml/parse-string.js';

const FILE_NAME = 'a.toml';

async function createContext(template, target) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        [FILE_NAME]:
          template !== undefined ? stringify(template) : undefined
      }
    },
    targetRepo: {
      master: {
        [FILE_NAME]: target !== undefined ? stringify(target) : undefined
      }
    }
  });

  return PreparedContext.from(
    new Context(provider, { templateBranchName: 'templateRepo' }),
    'targetRepo'
  );
}

test('toml merge', async t => {
  const context = await createContext(
    {
      key: 'value'
    },
    {
      oldKey: 'oldValue'
    }
  );

  const json = new TOML(FILE_NAME);
  const merged = await json.merge(context);

  t.deepEqual(parse(merged.content), {
    key: 'value',
    oldKey: 'oldValue'
  });
});

