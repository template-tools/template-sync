import test from "ava";
import { merge, isEqual } from "../src/travis.mjs";

test("travis isEqual", t => {
  t.true(isEqual(1,1));
  t.true(isEqual(123n,123n));
  t.true(isEqual(true,true));
  t.true(isEqual("a","a"));
  t.true(isEqual([],[]));
  t.false(isEqual([1],[2]));
  t.true(isEqual({a:1},{a:1}));
  t.false(isEqual({a:1},{a:2}));
  t.false(isEqual({a:1},{a:1,b:0}));
  t.false(isEqual({a:1,b:0},{a:1}));
  t.true(isEqual({a:[1]},{a:[1]}));
});

test("travis merge scalars", t => {
  const messages = [];

  t.deepEqual(
    merge(
      {
        "string": "abc",
        "boolean": true,
        "number" : 123,
        "bigint" : 123n,
        x1 : null,
        x2 : [1]
      },
      {
        "string": "abc",
        "boolean": true,
        "number" : 123,
        "bigint" : 123n,
        x1 : null,
        x2 : [1]
      },
      undefined,
      messages
    ),
    {
        "string": "abc",
        "boolean": true,
        "number" : 123,
        "bigint" : 123n,
        x1 : null,
        x2 : [1]
    }
  );

  t.deepEqual(messages, [
  ]);
});
