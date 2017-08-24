import test from 'ava';
import Context from '../src/context';
import Readme from '../src/readme';
import Package from '../src/package';
import Client from './client';

test('readme', async t => {
  const context = new Context(
    new Client({
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
    }),
    'targetRepo',
    'templateRepo',
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
