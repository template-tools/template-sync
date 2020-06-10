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

test.skip(
  yamlt,
  YAML,
  `a:
    - {{name}}
    `,
  `a:
     - {{name}}
    `,
  { name: "a name" },
  { expand: false },
  `a:
    - a name
  `
);
