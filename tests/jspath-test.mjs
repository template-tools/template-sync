import test from "ava";
import { jspath } from "../src/util";

test("jspath set", t => {
  const object = {
    a: { b: { c: 3 } }
  };

  jspath(object, "a.b.c", (value, setter) => setter(7));

  t.deepEqual(object, { a: { b: { c: 7 } } });
});

test("jspath set $", t => {
  const object = {
    a: { b: { c: 3 } }
  };

  jspath(object, "$.a.b.c", (value, setter) => setter(7));

  t.deepEqual(object, { a: { b: { c: 7 } } });
});

test("jspath get", t => {
  const object = {
    a: { b: { c: 3 } }
  };

  let x;

  jspath(object, "a.b.c", (value, setter) => x = value);

  t.is(x, 3);
});
