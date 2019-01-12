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

test("jspath get $.a['b'].c", t =>
  t.is(
    jspath(
      {
        a: { b: { c: 3 } }
      },
      "$.a['b'].c"
    ),
    3
  ));

test("jspath set $.a['b'].c", t => {
  const object = {
    a: { b: { c: 3 } }
  };

  jspath(object, "$.a['b'].c", (value, setter) => setter(7));

  t.deepEqual(object, { a: { b: { c: 7 } } });
});

test("jspath get", t =>
  t.is(
    jspath(
      {
        a: { b: { c: 3 } }
      },
      "a.b.c"
    ),
    3
  ));
