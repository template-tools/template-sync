import test from 'ava';
import { MockProvider } from 'mock-repository-provider';

import { Context } from '../src/context.mjs';
import { PreparedContext } from '../src/prepared-context.mjs';
import { Replace } from '../src/replace.mjs';

test('replace', async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: `Line 1x
Line 2x`
      }
    },
    targetRepo: {
      master: {
        aFile: `Line 1
Line 2`
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templates: ["templateRepo"]
    }),
    'targetRepo'
  );

  const replace = new Replace('aFile');
  const merged = await replace.merge(context);
  t.deepEqual(
    merged.content,
    `Line 1x
Line 2x`
  );
});
