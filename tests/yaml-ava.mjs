import test from "ava";
import { yamlt } from "./helpers/util.mjs";
import { YAML } from "../src/mergers/yaml.mjs";

test(
  yamlt,
  YAML,
  `a:
  - {{name}}
  `,
  `a:
   - a name
  `,
  { name: "a name" },
  { expand: true },
  `a:
  - a name
`
);

test(
  yamlt,
  YAML,
  undefined,
  `a:
   - a name
  `,
  {},
  {},
  `a:
  - a name
`
);

test(
  "yaml referse",
  yamlt,
  YAML,
  `a:
   - a name
  `,
  undefined,
  {},
  {},
  `a:
  - a name
`
);

test(
  yamlt,
  YAML,
  `a:
- {{name}}`,
  `a:
- {{name}}`,
  { name: "a name" },
  { expand: true },
  `a:
  - a name
`
);

test(
  yamlt,
  YAML,
  "boolean: false",
  "boolean: false",
  {},
  {},
  `boolean: false
`
);

test.skip(
  yamlt,
  YAML,
  `jobs:
  test:
    strategy:
      matrix:
        node-version:
          - -15
          - 15.1.0
  `,
  undefined,
  {},
  {
    mergeHints: {
      "*.matrix.node-version": {
        merge: "mergeVersionsPreferNumeric"
      }
    }
  },
  `jobs:
  test:
    strategy:
      matrix:
        node-version:
          - 15.1.0
`
);
