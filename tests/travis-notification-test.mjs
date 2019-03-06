import test from "ava";
import { merge } from "../src/travis";

const templateFragment = {
  notifications: {
    email: ["-a","c"]
  }
};

test("travis notifications add/remove", t => {
  const originalFragment = {
    notifications: {
      email: ["a","b"]
    }
  };

  const messages = [];
  t.deepEqual(
    merge(originalFragment, templateFragment, undefined, messages),
    {
      notifications: {
        email: ["b","c"]
      }
    }
  );

  t.deepEqual(messages, [
    "chore(travis): remove a from notifications.email",
    'chore(travis): add c to notifications.email'
  ]);
});
