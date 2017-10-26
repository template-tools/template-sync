import test from 'ava';
import Context from '../src/context';
import Readme from '../src/readme';
import Package from '../src/package';
import { MockProvider } from './repository-mock';

test.only('readme', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `[![Badge 1
[![Badge 2

body
body`,
      targetRepo: `[![Badge 1

body
body`
    },
    'package.json': {
      templateRepo: JSON.stringify({
        template: {
          badges: [
            {
              name: 'npm',
              icon: 'https://img.shields.io/npm/v/{{name}}.svg',
              url: 'https://www.npmjs.com/package/{{name}}'
            }
          ]
        }
      }),
      targetRepo: '{}'
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  context.addFile(new Package('package.json'));

  const readme = new Readme('aFile');
  const merged = await readme.merge(context);

  t.deepEqual(
    merged.content,
    `
body
body`
  );
});
