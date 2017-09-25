import test from 'ava';
import Context from '../src/context';
import Rollup from '../src/rollup';

import { MockProvider } from './repository-mock';

test('context used dev modules', async t => {
  const provider = new MockProvider({
    'rollup.config.json': {
      templateRepo: `import babel from 'rollup-plugin-babel';
export default {
  plugins: [
    babel({
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ]
};`,
      targetRepo: `import babel from 'rollup-plugin-babel';
export default {
  plugins: [
    babel({
      presets: ['stage-3'],
      exclude: 'node_modules/**'
    })
  ]
};`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo')
  );

  context.addFile(new Rollup('rollup.config.js'));

  t.deepEqual(await context.usedDevModules(), new Set(['rollup-plugin-babel']));
});
