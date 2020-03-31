import test from "ava";
import { yamlt } from "./helpers/util.mjs";
import { Travis } from "../src/mergers/travis.mjs";

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

async function travist(t, template, content, expected, message) {
  return yamlt(
    t,
    Travis,
    `node_js:
${template
  .map(
    v => `  - ${v}
`
  )
  .join("")}
`,
    `node_js:
${content
  .map(
    v => `  - ${v}
`
  )
  .join("")}
`,
    undefined,
    expected,
    message
  );
}

travist.title = (
  providedTitle = "",
  template,
  content,
  expected,
  message = []
) =>
  `Travis node versions ${providedTitle} ${JSON.stringify(
    template
  )} ${content} ${expected}`.trim();

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

test(
  "travis node versions merge",
  travist,
  ["8.9.3", "9"],
  ["8.9.3"],
  `node_js:
  - 8.9.3
  - 9
`
);

test(
  "travis node versions none numeric",
  travist,
  ["7.7.2", "-iojs"],
  ["7.7.1", "iojs"],

  `node_js:
  - 7.7.1
  - 7.7.2
`,
  "chore(travis): add 7.7.2 remove iojs (node_js)"
);

test(
  "travis node versions simple",
  travist,
  ["7.7.2"],
  ["7.7.1"],
  `node_js:
  - 7.7.1
  - 7.7.2
`
);

test(
  "travis node versions complex",
  travist,
  ["7.7.2"],
  ["6.10.1", "7.7.1"],
  `node_js:
  - 6.10.1
  - 7.7.1
  - 7.7.2
`
);

test(
  "travis node semver mayor only",
  travist,
  ["7.7.2"],
  ["5", "6.2"],
  `node_js:
  - 5
  - 6.2
  - 7.7.2
`
);

test(
  "travis node semver remove",
  travist,
  ["-4", "-5", "-7", "7.7.2"],
  ["4.2", "4.2.3", "5.1", "7.7.0", "7.7.1", "9.3"],
  `node_js:
  - 7.7.2
  - 9.3
`
);

test(
  "travis node semver two digits",
  travist,
  ["'8.10'", "-8"],
  ["8.9.4"],
  `node_js:
  - '8.10'
`
);
