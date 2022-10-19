import test from "ava";
import { actions2message } from "../src/util.mjs";

function a2mt(t, actions, expected) {
  t.is(actions2message(actions, "prefix", "name"), expected);
}

a2mt.title = (providedTitle = "", sources, remove, expected) =>
  `actions2message ${providedTitle} ${sources} ${
    remove === undefined ? "" : remove
  }`.trim();

test(
  a2mt,
  {
    a: [{ add: [{}], type: "fix", scope: "package" }],
    b: [{ add: [{}], type: "chore", scope: "package" }]
  },
`fix(package): (a)
chore(package): (b)`
);
