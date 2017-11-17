import test from 'ava';
import Context from '../src/context';
import Replace from '../src/replace';
import { MockProvider } from 'mock-repository-provider';

test('replace', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `Line 1x
Line 2x`,
      targetRepo: `Line 1
Line 2`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const replace = new Replace('aFile');
  const merged = await replace.merge(context);
  t.deepEqual(
    merged.content,
    `Line 1x
Line 2x`
  );
});
