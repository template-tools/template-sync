import test from 'ava';
import Context from '../src/context';
import Readme from '../src/readme';
import Package from '../src/package';
import { MockProvider } from './repository-mock';

test('readme', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `Line 1x
      Line 2x`,
      targetRepo: `Line 1

Line 2`
    },
    'package.json': {
      templateRepo: JSON.stringify({}),
      targetRepo: '{}'
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  context.addFile(new Package(context, 'package.json'));

  const readme = new Readme(context, 'aFile');
  const merged = await readme.merge;

  t.deepEqual(
    merged.content,
    `
Line 2`
  );
});
