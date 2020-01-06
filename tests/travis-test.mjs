import test from "ava";
import yaml from "js-yaml";

import { MockProvider } from "mock-repository-provider";

import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";
import { Travis } from "../src/travis.mjs";

async function travisMerge(template, original) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: yaml.safeDump(template)
      }
    },
    targetRepo: {
      master: {
        aFile: yaml.safeDump(original)
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new Travis("aFile");
  return await merger.merge(context);
}

async function mockYmlVersions(templateVersions, targetVersions) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: `node_js:
${templateVersions
  .map(
    v => `  - ${v}
`
  )
  .join("")}
`
      }
    },
    targetRepo: {
      master: {
        aFile: `node_js:
${targetVersions
  .map(
    v => `  - ${v}
`
  )
  .join("")}
`
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new Travis("aFile");
  return merger.merge(context);
}

test("travis node versions merge", async t => {
  const merged = await mockYmlVersions(["8.9.3", "9"], ["8.9.3"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - 8.9.3
  - 9
`
  );
});

test("travis node versions none numeric", async t => {
  const merged = await mockYmlVersions(["7.7.2", "-iojs"], ["7.7.1", "iojs"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.1
  - 7.7.2
`
  );

  t.deepEqual(merged.messages, [
    "chore(travis): add 7.7.2 remove iojs (node_js)"
  ]);
});

test("travis node versions simple", async t => {
  const merged = await mockYmlVersions(["7.7.2"], ["7.7.1"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.1
  - 7.7.2
`
  );
});

test("travis node versions complex", async t => {
  const merged = await mockYmlVersions(["7.7.2"], ["6.10.1", "7.7.1"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - 6.10.1
  - 7.7.1
  - 7.7.2
`
  );
});

test("travis node semver mayor only", async t => {
  const merged = await mockYmlVersions(["7.7.2"], ["5", "6.2"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - 5
  - 6.2
  - 7.7.2
`
  );
});

test("travis node semver remove", async t => {
  const merged = await mockYmlVersions(
    ["-4", "-5", "-7", "7.7.2"],
    ["4.2", "4.2.3", "5.1", "7.7.0", "7.7.1", "9.3"]
  );

  t.deepEqual(
    merged.content,
    `node_js:
  - 7.7.2
  - 9.3
`
  );
});

test("travis node semver two digits", async t => {
  const merged = await mockYmlVersions(["'8.10'", "-8"], ["8.9.4"]);

  t.deepEqual(
    merged.content,
    `node_js:
  - '8.10'
`
  );
});

test("travis remove before_script", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: `before_script:
  - npm prune
  - -npm install -g codecov
`
      }
    },
    targetRepo: {
      master: {
        aFile: `before_script:
  - npm prune
  - npm install -g codecov
`
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new Travis("aFile");
  const merged = await merger.merge(context);
  t.deepEqual(
    merged.content,
    `before_script:
  - npm prune
`
  );
});

test("start fresh", async t => {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: `node_js:
  - 7.7.2
before_script:
  - npm prune
  - -npm install -g codecov
`
      }
    },
    targetRepo: {
      master: {
        aFile: ""
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new Travis("aFile");
  const merged = await merger.merge(context);

  t.deepEqual(
    merged.content,
    `node_js: 7.7.2
before_script:
  - npm prune
`
  );
});

test("travis scripts", async t => {
  const merged = await travisMerge(
    {
      language: "node_js",
      jobs: {
        include: {
          script: [
            "cat ./coverage/lcov.info | coveralls",
            "npm install -g --production codecov",
            "npm test",
            "-npm install -g --production coveralls codecov"
          ]
        }
      }
    },
    {
      language: "node_js",
      jobs: {
        include: {
          script: ["npm install -g --production coveralls codecov", "npm test"]
        }
      }
    }
  );

  t.deepEqual(
    merged.content,
    `language: node_js
jobs:
  include:
    script:
      - npm install -g --production codecov
      - npm test
      - cat ./coverage/lcov.info | coveralls
`
  );

  t.deepEqual(merged.messages, [
    "chore(travis): add cat ./coverage/lcov.info | coveralls (jobs.include.script)",
    "chore(travis): add npm install -g --production codecov (jobs.include.script)",
    "chore(travis): remove npm install -g --production coveralls codecov (jobs.include.script)"
  ]);
});
