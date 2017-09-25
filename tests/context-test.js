import test from 'ava';
import Context from '../src/context';
import { MockProvider } from './repository-mock';

test.only('context used dev modules', async t => {
  const provider = new MockProvider({
    'rollup.config.json': {
      templateRepo: '',
      targetRepo: ''
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo')
  );

  t.deepEqual(await context.usedDevModules(), new Set());
});
