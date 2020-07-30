import test from 'ava';
import { MockProvider } from 'mock-repository-provider';
import { Context } from '../src/context.mjs';

test('context create', async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {}
    },
    'owner/targetRepo': {
      master: {}
    }
  });

  const context = new Context(provider, 'owner/targetRepo', { template: 'templateRepo'});

  await context.initialize();

  t.is(context.provider, provider);
  t.is(context.dry, false);
  t.is(context.track, false);
  t.deepEqual(context.templateSources, ['templateRepo']);
  t.deepEqual(context.properties.date, { year: new Date().getFullYear() });
  t.is(context.properties.fullName, 'targetRepo');
});
