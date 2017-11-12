import test from 'ava';
import Context from '../src/context';
import Travis from '../src/travis';
import { MockProvider } from './repository-mock';

test('travis node versions none numeric', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 7.7.1
  - iojs
`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);

  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
`
  );
});

test('travis node versions simple', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 7.7.1
`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);

  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
`
  );
});

test('travis node versions complex', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 6.10.1
  - 7.7.1
`
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
  - 6.10.1
`
  );
});

test('travis node semver mayor only', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: `node_js:
  - 5
  - 6.2
`
    }
  });
  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
  - 5
  - 6.2
`
  );
});

test('travis node semver remove', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - -4
  - 7.7.2
`,
      targetRepo: `node_js:
  - 4.2
  - 4.2.3
`
    }
  });
  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
`
  );
});

test('travis remove before_script', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `before_script:
  - npm prune
  - -npm install -g codecov
`,
      targetRepo: `before_script:
  - npm prune
  - npm install -g codecov
`
    }
  });
  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `before_script:
  - npm prune
`
  );
});

test('start fresh', async t => {
  const provider = new MockProvider({
    aFile: {
      templateRepo: `node_js:
  - 7.7.2
`,
      targetRepo: ''
    }
  });

  const context = new Context(
    await provider.repository('targetRepo'),
    await provider.repository('templateRepo'),
    {}
  );

  const merger = new Travis('aFile');
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
`
  );
});
