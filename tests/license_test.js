import test from 'ava';
import Context from '../src/Context';
import License from '../src/License';
import Client from './Client';

test('modify one year', async t => {
  const context = new Context(new Client({
    aFile: {
      templateRepo: 'Copyright (c) {{date.year}} by {{owner}}',
      targetRepo: 'Copyright (c) 1999 by xyz'
    }
  }), 'targetRepo', 'templateRepo', {
    'date.year': 2099,
    'license.owner': 'xyz'
  });

  const license = new License(context, 'aFile');
  const merged = await license.merge;

  t.deepEqual(merged.content, 'Copyright (c) 1999,2099 by xyz');
});

test('modify year list', async t => {
  const context = new Context(new Client({
    aFile: {
      templateRepo: 'Copyright (c) {{date.year}} by {{owner}}',
      targetRepo: 'Copyright (c) 2001,1999,2000,2001,2007 by xyz'
    }
  }), 'targetRepo', 'templateRepo', {
    'date.year': 2099,
    'license.owner': 'xyz'
  });

  const license = new License(context, 'aFile');
  const merged = await license.merge;

  t.deepEqual(merged.content, 'Copyright (c) 1999,2000,2001,2007,2099 by xyz');
});
