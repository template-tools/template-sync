import test from 'ava';
import Context from '../src/Context';
import Package from '../src/Package';
import Client from './Client';

const FILE_NAME = 'package.json';

function createContext(template, target) {
  return new Context(new Client({
      [FILE_NAME]: {
        templateRepo: template !== undefined ? JSON.stringify(template) : undefined,
        'tragetUser/targetRepo': target !== undefined ? JSON.stringify(target) : undefined
      }
    }),
    'tragetUser/targetRepo',
    'templateRepo', {
      'github.repo': 'the-repo-name'
    });
}

test('delete entries', async t => {
  const context = createContext({
    slot: {
      something: '--delete--',
      add: 2
    }
  }, {
    slot: {
      something: {
        a: 1
      },
      preserve: 3
    }
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content).slot, {
    preserve: 3
  });

  t.deepEqual(merged.messages, ['chore(npm): delete slot.something']);
});

test('package devDependencies', async t => {
  const context = createContext({
    devDependencies: {
      a: '-',
      c: '1'
    }
  }, {
    devDependencies: {
      a: '1',
      b: '1'
    }
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    b: '1',
    c: '1'
  });

  t.deepEqual(merged.messages, ['chore(devDependencies): remove a@1',
    'chore(devDependencies): add c@1 from template'
  ]);
});

test('package keywords', async t => {
  const context = createContext({
    template: {
      keywords: {
        _xxx_: 'XXX'
      }
    }
  }, {
    name: 'abc_xxx_1',
    template: {
      repository: {
        url: `https://github.com/.git`
      }
    },
    keywords: ['YYY']
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content).keywords, ['YYY', 'XXX']);
  t.deepEqual(merged.messages, ['docs(package): add keyword XXX']);
});

test('package keywords empty', async t => {
  const context = createContext({
    template: {
      keywords: {
        _xxx_: 'XXX'
      }
    }
  }, {
    name: 'abc_xxx_1'
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content).keywords, ['XXX']);
  t.deepEqual(merged.messages, ['docs(package): add keyword XXX']);
});

test('add xo/space=true', async t => {
  const context = createContext({
    xo: {
      space: true
    }
  }, {
    xo: {
      space: true
    }
  });

  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content).xo, {
    space: true
  });
  t.deepEqual(merged.messages, ['chore: update package.json from template']);
});

test('start fresh', async t => {
  const context = createContext({});
  const pkg = new Package(context, 'package.json');
  const merged = await pkg.merge;

  t.deepEqual(JSON.parse(merged.content), {
    name: 'targetRepo',
    devDependencies: {},
    engines: {},
    scripts: {},
    template: {
      repository: {
        url: 'https://github.com/templateRepo.git'
      }
    }
  });
});
