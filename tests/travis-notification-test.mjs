import test from "ava";
import { merge, mergeArrays } from "../src/travis.mjs";

test("travis notifications add/remove", t => {
  const messages = [];

  t.deepEqual(
    merge(
      {
        notifications: {
          email: ["a", "b"]
        }
      },
      {
        notifications: {
          email: ["-a", "c"]
        }
      },
      undefined,
      messages
    ),
    {
      notifications: {
        email: ["b", "c"]
      }
    }
  );

  t.deepEqual(messages, [
    "chore(travis): remove a from notifications.email",
    "chore(travis): add c to notifications.email"
  ]);
});

test("travis mergeArrays empty", t => {
  t.deepEqual(mergeArrays([], undefined), []);
  t.deepEqual(mergeArrays([], []), []);
  t.deepEqual(mergeArrays(undefined, []), undefined);
  t.deepEqual(mergeArrays(undefined, undefined), undefined);
});

test("travis mergeArrays", t => {
  t.deepEqual(mergeArrays(["a"], undefined), ["a"]);
  t.deepEqual(mergeArrays(undefined, ["a"]), ["a"]);
  t.deepEqual(mergeArrays(["a"], ["a"]), ["a"]);
});

test("travis mergeArrays remove", t => {
  t.deepEqual(mergeArrays(undefined, ["-a"]), undefined);
  t.deepEqual(mergeArrays([], ["-a"]), []);
  t.deepEqual(mergeArrays(["a"], ["-a"]), []);
  t.deepEqual(mergeArrays(["a", "b"], ["-a", "c"]), ["b", "c"]);
});

test("travis mergeArrays duplicates", t => {
  t.deepEqual(mergeArrays(["a", "b"], ["a"]), ["a", "b"]);
});
