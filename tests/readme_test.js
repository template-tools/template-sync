import test from 'ava';
import Context from '../src/Context';
import Readme from '../src/Readme';
import Package from '../src/Package';
import Client from './Client';

test('readme', async t => {
  const context = new Context(new Client({
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
  }), 'targetRepo', 'templateRepo', {});

  context.addFile(new Package(context, 'package.json'));

  const readme = new Readme(context, 'aFile');
  const merged = await readme.merge;

  t.deepEqual(merged.content, `
Line 2`);
});
