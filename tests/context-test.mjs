import test from 'ava';
import { MockProvider } from 'mock-repository-provider';

import { Context } from '../src/context.mjs';

test('context create', t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {}
    },
    'owner/targetRepo': {
      master: {}
    }
  });

  const context = new Context(provider);

  t.is(context.provider, provider);
  t.is(context.dry, false);
  t.is(context.trackUsedByModule, false);
  t.deepEqual(context.properties.date, { year: new Date().getFullYear() });
});
