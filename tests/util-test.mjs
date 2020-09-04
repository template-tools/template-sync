import test from "ava";
import { normalizeTemplateSources } from "../src/util.mjs";

function ntst(t, source, remove, expected) {
  t.deepEqual(normalizeTemplateSources(source, remove), expected);
}

ntst.title = (providedTitle = "", sources, remove, expected) =>
  `normalize template sources ${providedTitle} ${sources} ${
    remove === undefined ? "" : remove
  }`.trim();

test(ntst, ["b", "a"], undefined, ["a", "b"]);
test(ntst, ["b", "a"], ["a"], ["b"]);
test(ntst, ["b", "-a"], undefined, ["b"]);
test(ntst, ["b", "a", "-a"], undefined, ["b"]);
