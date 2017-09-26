import test from 'ava';
import Context from '../src/context';
import Rollup from '../src/rollup';

import { MockProvider } from './repository-mock';

const ROLLUP_FILE_CONTENT = `import babel from 'rollup-plugin-babel';

export default {
  plugins: [],
  input: 'file.js',
  output: {
    format: 'cjs',
    file: 'main.js'
  }
};`;

test('context used dev modules', async t => {
  const provider = new MockProvider({
    'rollup.config.js': {
      templateRepo: ROLLUP_FILE_CONTENT,
      targetRepo: ROLLUP_FILE_CONTENT
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo')
  );

  context.addFile(new Rollup('rollup.config.js'));

  t.deepEqual(await context.usedDevModules(), new Set(['rollup-plugin-babel']));
});

test('context optional dev modules', async t => {
  const provider = new MockProvider({
    'rollup.config.js': {
      templateRepo: ROLLUP_FILE_CONTENT,
      targetRepo: ROLLUP_FILE_CONTENT
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo')
  );

  context.addFile(new Rollup('rollup.config.js'));

  t.deepEqual(
    context.optionalDevModules(new Set(['rollup-plugin-babel'])),
    new Set(['rollup-plugin-babel'])
  );
});
