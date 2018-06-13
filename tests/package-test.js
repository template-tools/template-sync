import test from 'ava';
import { Context } from '../src/context';
import { PreparedContext } from '../src/prepared-context';

import { Package } from '../src/package';
import { MockProvider } from 'mock-repository-provider';

const FILE_NAME = 'package.json';

async function createContext(template, target) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        [FILE_NAME]:
          template !== undefined ? JSON.stringify(template) : undefined
      }
    },
    'tragetUser/targetRepo': {
      master: {
        [FILE_NAME]: target !== undefined ? JSON.stringify(target) : undefined
      }
    }
  });

  return await PreparedContext.from(
    new Context(provider, {
      templateBranchName: 'templateRepo',
      github: {
        repo: 'the-repo-name',
        user: 'the-user-name'
      },
      user: 'x-user'
    }),
    'tragetUser/targetRepo'
  );
}

test('default options', t => {
  const pkg = new Package('package.json');
  t.deepEqual(pkg.options.actions, []);

  const pkg2 = new Package('package.json', {
    actions: [{ path: "$.nyc['report-dir']", op: 'replace' }]
  });
  t.deepEqual(pkg2.options.actions, [
    { path: "$.nyc['report-dir']", op: 'replace' }
  ]);
});

test('package extract properties', async t => {
  const context = await createContext(
    {},
    {
      name: 'aName',
      version: '1.2.3',
      description: 'a description',
      module: 'a module'
    }
  );

  const pkg = new Package('package.json');
  const targetBranch = await context.provider.branch('tragetUser/targetRepo');
  const properties = await pkg.properties(targetBranch);

  t.deepEqual(properties, {
    npm: { name: 'aName', fullName: 'aName' },
    description: 'a description',
    module: 'a module',
    name: 'aName',
    version: '1.2.3'
  });
});

test('package extract properties not 0.0.0-semantic-release', async t => {
  const context = await createContext(
    {},
    {
      name: 'aName',
      version: '0.0.0-semantic-release'
    }
  );

  const pkg = new Package('package.json');
  const targetBranch = await context.provider.branch('tragetUser/targetRepo');
  const properties = await pkg.properties(targetBranch);

  t.deepEqual(properties, {
    npm: { name: 'aName', fullName: 'aName' },
    name: 'aName'
  });
});

test('package merge engines (skip lower versions in template)', async t => {
  const context = await createContext(
    {
      engines: {
        node: '>=8'
      }
    },
    {
      engines: {
        node: '>=10'
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).engines, {
    node: '>=10'
  });
});

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

  t.deepEqual(JSON.parse(merged.content).devDependencies, {});
  //t.true(merged.messages.includes('chore(devDependencies): remove cracks'));
});

test('package devDependencies', async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: '-',
        c: '1',
        d: '-',
        e: '1'
      }
    },
    {
      devDependencies: {
        a: '1',
        b: '1',
        e: '2'
      }
    }
  );

  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    b: '1',
    c: '1',
    e: '2'
  });

  t.true(
    merged.messages.includes('chore(package): remove a@1') &&
      merged.messages.includes('chore(package): add c@1')
  );
});

test('package keywords', async t => {
  const context = await createContext(
    {},
    {
      name: 'abc_xxx_1',
      template: {
        repository: {
          url: `https://github.com/.git`
        }
      },
      keywords: ['A', 'B']
    }
  );

  const pkg = new Package('package.json', {
    keywords: {
      _xxx_: 'X'
    }
  });
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, ['A', 'B', 'X']);
  t.true(merged.messages.includes('docs(package): add keyword X'));
});

test('package keywords empty', async t => {
  const context = await createContext(
    {},
    {
      name: 'abc_xxx_1'
    }
  );

  const pkg = new Package('package.json', {
    keywords: {
      _xxx_: 'XXX'
    }
  });
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
  //t.true(merged.messages.includes('chore: update package.json'));
});

test('jsonpath', async t => {
  const context = await createContext(
    {
      nyc: {
        'report-dir': './build/coverage'
      }
    },
    {
      nyc: {
        'report-dir': './coverage'
      }
    }
  );

  const pkg = new Package('package.json', {
    actions: [{ path: "$.nyc['report-dir']", op: 'replace' }]
  });
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).nyc, {
    'report-dir': './build/coverage'
  });
  t.true(
    merged.messages.includes(
      "chore(package): set $.nyc['report-dir']='./build/coverage' as in template"
    )
  );
});

test('repository change only', async t => {
  const context = await createContext(
    {},
    {
      homepage: 'http://mock-provider.com/tragetUser/targetRepo#readme',
      bugs: {
        url: 'http://mock-provider.com/tragetUser/targetRepo/issues'
      },
      template: {
        repository: {
          url: 'http://mock-provider.com/templateRepo'
        }
      }
    }
  );
  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(merged.messages, ['chore(package): correct repository url']);

  t.deepEqual(JSON.parse(merged.content), {
    name: 'targetRepo',
    homepage: 'http://mock-provider.com/tragetUser/targetRepo#readme',
    bugs: {
      url: 'http://mock-provider.com/tragetUser/targetRepo/issues'
    },
    repository: {
      type: 'git',
      url: 'http://mock-provider.com/tragetUser/targetRepo'
    },
    template: {
      repository: {
        url: 'http://mock-provider.com/templateRepo'
      }
    }
  });
});

test('start fresh', async t => {
  const context = await createContext({});
  const pkg = new Package('package.json');
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    name: 'targetRepo',
    homepage: 'http://mock-provider.com/tragetUser/targetRepo#readme',
    bugs: {
      url: 'http://mock-provider.com/tragetUser/targetRepo/issues'
    },
    repository: {
      type: 'git',
      url: 'http://mock-provider.com/tragetUser/targetRepo'
    },
    template: {
      repository: {
        url: 'http://mock-provider.com/templateRepo'
      }
    }
  });
});
