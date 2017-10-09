import test from 'ava';
import Context from '../src/context';
import Package from '../src/package';
import { MockProvider } from './repository-mock';

const FILE_NAME = 'package.json';

async function createContext(template, target) {
  const provider = new MockProvider({
    [FILE_NAME]: {
      templateRepo:
        template !== undefined ? JSON.stringify(template) : undefined,
      'tragetUser/targetRepo':
        target !== undefined ? JSON.stringify(target) : undefined
    }
  });

  return new Context(
    await provider.repository('tragetUser/targetRepo'),
    await provider.repository('templateRepo'),
    {
      'github.repo': 'the-repo-name',
      'github.user': 'the-user-name',
      user: 'x-user'
    }
  );
}

test('delete entries', async t => {
  const context = await createContext(
    {
      slot: {
        something: '--delete--',
        add: 2
      },
      other: '--delete--'
    },
    {
      slot: {
        something: {
          a: 1
        },
        preserve: 3
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).slot, {
    preserve: 3
  });

  t.false(merged.messages.includes('chore(npm): delete other'));
  t.true(merged.messages.includes('chore(npm): delete slot.something'));
});

test('package preserve extra prepare', async t => {
  const context = await createContext(
    {
      scripts: {
        prepare: 'rollup x y z && chmod +x bin/xx',
        preprocess: 'rollup a'
      }
    },
    {
      scripts: {
        prepare: 'rollup x y && chmod +x bin/xx',
        preprocess: 'rollup a && chmod +x bin/yy'
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).scripts, {
    prepare: 'rollup x y z && chmod +x bin/xx',
    preprocess: 'rollup a && chmod +x bin/yy'
  });
});

test('package handle missing scripts in template', async t => {
  const context = await createContext(
    {
      scripts: {
        prepare: 'rollup'
      }
    },
    {}
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).scripts, {
    prepare: 'rollup'
  });
});

test('package devDependencies keep cracks', async t => {
  const context = await createContext(
    {
      devDependencies: {}
    },
    {
      release: {
        verifyRelease: 'cracks'
      },
      devDependencies: {
        cracks: '3.1.2',
        'dont-crack': '1.0.0'
      }
    }
  );

  const pkg = new Package('package.json');
  context.addFile(pkg);

  const merged = await pkg.merge(context);

  //console.log(merged.messages);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    cracks: '3.1.2'
  });
});

test('package devDependencies remove cracks', async t => {
  const context = await createContext(
    {
      devDependencies: {}
    },
    {
      devDependencies: {
        cracks: '3.1.2',
        'dont-crack': '1.0.0'
      }
    }
  );

  const pkg = new Package('package.json');
  context.addFile(pkg);
  const merged = await pkg.merge(context);

  //console.log(merged.messages);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {});
  //t.true(merged.messages.includes('chore(devDependencies): remove cracks'));
});

test('package devDependencies', async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: '-',
        c: '1'
      }
    },
    {
      devDependencies: {
        a: '1',
        b: '1'
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    b: '1',
    c: '1'
  });

  t.true(
    merged.messages.includes('chore(devDependencies): remove a@1') &&
      merged.messages.includes('chore(devDependencies): add c@1 from template')
  );
});

test('package keywords', async t => {
  const context = await createContext(
    {
      template: {
        keywords: {
          _xxx_: 'XXX'
        }
      }
    },
    {
      name: 'abc_xxx_1',
      template: {
        repository: {
          url: `https://github.com/.git`
        }
      },
      keywords: ['YYY']
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, ['YYY', 'XXX']);
  t.true(merged.messages.includes('docs(package): add keyword XXX'));
});

test('package keywords empty', async t => {
  const context = await createContext(
    {
      template: {
        keywords: {
          _xxx_: 'XXX'
        }
      }
    },
    {
      name: 'abc_xxx_1'
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, ['XXX']);
  t.true(merged.messages.includes('docs(package): add keyword XXX'));
});

test('package remove null keyword', async t => {
  const context = await createContext(
    {
      template: {}
    },
    {
      name: 'abc_xxx_1',
      keywords: [null]
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, []);
  t.true(merged.messages.includes('docs(package): remove keyword null'));
});

test('add xo/space=true', async t => {
  const context = await createContext(
    {
      xo: {
        space: true
      }
    },
    {
      xo: {
        space: true
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).xo, {
    space: true
  });
  //t.true(merged.messages.includes('chore: update package.json from template'));
});

test('start fresh', async t => {
  const context = await createContext({});
  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    name: 'targetRepo',
    devDependencies: {},
    engines: {},
    scripts: {},
    homepage: 'https://github.com/x-user/targetRepo#readme',
    bugs: {
      url: 'https://github.com/x-user/targetRepo/issues'
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/x-user/targetRepo.git'
    },
    template: {
      repository: {
        url: 'https://github.com/templateRepo.git'
      }
    }
  });
});
