import test from 'ava';
import { Context } from '../src/context';
import { Readme } from '../src/readme';
import { Package } from '../src/package';
import { MockProvider } from 'mock-repository-provider';

test('readme default options', t => {
  const readme = new Readme('aFile');
  t.deepEqual(readme.options.badges, []);
});

test('readme', async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: ``,
        'package.json': JSON.stringify({
          template: {}
        })
      }
    },
    targetRepo: {
      master: {
        aFile: `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)

[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)
[![Badge 2](http://domain.net/somewhere2.svg)](http://domain.net/somewhere2)

body
body`,
        'package.json': '{}'
      }
    }
  });

  const context = new Context({});
  context.targetBranch = await provider.branch('targetRepo');
  context.templateBranch = await provider.branch('templateRepo');

  context.addFile(new Package('package.json'));

  const readme = new Readme('aFile', {
    badges: [
      {
        name: 'Badge 1',
        icon: 'http://domain.net/somewhere1.svg',
        url: 'http://domain.net/somewhere1'
      }
    ]
  });

  const merged = await readme.merge(context);

  t.deepEqual(
    merged.content,
    `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)


body
body`
  );
});
