import test from 'ava';
import Context from '../src/context';
import License from '../src/license';
import { MockProvider } from './repository-mock';

test('modify one year', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: 'Copyright (c) {{date.year}} by {{owner}}',
      targetRepo: 'Copyright (c) 1999 by xyz'
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {
      'date.year': 2099,
      'license.owner': 'xyz'
    }
  );

  const license = new License('aFile');
  const merged = await license.merge(context);
  t.deepEqual(merged.messages, ['chore(license): add current year 2099']);
  t.deepEqual(merged.content, 'Copyright (c) 1999,2099 by xyz');
});

test('modify year list', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: 'Copyright (c) {{date.year}} by {{owner}}',
      targetRepo: 'Copyright (c) 2001,1999,2000,2001,2007 by xyz'
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {
      'date.year': 2099,
      'license.owner': 'xyz'
    }
  );

  const license = new License('aFile');
  const merged = await license.merge(context);
  t.deepEqual(merged.messages, ['chore(license): add current year 2099']);
  t.deepEqual(merged.content, 'Copyright (c) 1999,2000,2001,2007,2099 by xyz');
});
