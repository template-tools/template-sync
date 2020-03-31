import test from "ava";
import yaml from "js-yaml";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { createContext } from "./helpers/util.mjs";
import { Travis } from "../src/mergers/travis.mjs";

const FILE_NAME = ".travis.yml";

async function yamlt(
  t,
  factory,
  template,
  content,
  options,
  expected,
  message
) {
  const context = await createContext({
    template: "templateRepo",
    github: {
      repo: "the-repo-name",
      user: "the-user-name"
    },
    user: "x-user"
  });

  const commit = await factory.merge(
    context,
    content === undefined
      ? new EmptyContentEntry(FILE_NAME)
      : new StringContentEntry(
          FILE_NAME,
          typeof content === "string" ? content : yaml.safeDump(content)
        ),
    template === undefined
      ? new EmptyContentEntry(FILE_NAME)
      : new StringContentEntry(
          FILE_NAME,
          typeof template === "string" ? template : yaml.safeDump(template)
        ),
    { ...factory.defaultOptions, ...options }
  );

  if (message !== undefined) {
    t.is(commit.message, message);
  }

  const result = await commit.entry.getString();

  if (typeof expected === "function") {
    expected(t, yaml.safeLoad(result));
  } else {
    t.deepEqual(
      typeof expected === "string" ? result : yaml.safeLoad(result),
      expected === undefined ? content : expected
    );
  }
}

yamlt.title = (
  providedTitle = "",
  factory,
  template,
  content,
  options,
  expected,
  message = []
) =>
  `${factory.name} ${providedTitle} ${JSON.stringify(
    template
  )} ${content} ${expected}`.trim();

test(
  "remove before_script",
  yamlt,
  Travis,
  `before_script:
    - npm prune
    - -npm install -g codecov
  `,
  `before_script:
    - npm prune
    - npm install -g codecov
  `,
  undefined,
  `before_script:
  - npm prune
`
);

test(
  "scripts",
  yamlt,
  Travis,
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
  },
  undefined,
  `language: node_js
jobs:
  include:
    script:
      - npm install -g --production codecov
      - npm test
      - cat ./coverage/lcov.info | coveralls
`,
  [
    "chore(travis): add cat ./coverage/lcov.info | coveralls (jobs.include.script)",
    "chore(travis): add npm install -g --production codecov (jobs.include.script)",
    "chore(travis): remove npm install -g --production coveralls codecov (jobs.include.script)"
  ].join("\n")
);

test(
  "start fresh",
  yamlt,
  Travis,
  `node_js:
  - {{node_version}}
before_script:
  - npm prune
  - -npm install -g codecov
`,
  undefined,
  {
    properties: { node_version: "7.7.2" }
  },
  `node_js: 7.7.2
before_script:
  - npm prune
`
);

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

  const context = await Context.from(provider, "targetRepo", {
    template: "templateRepo"
  });

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
