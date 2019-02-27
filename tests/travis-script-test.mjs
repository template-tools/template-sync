import test from "ava";
import { merge } from "../src/travis";

const templateFragment = {
  jobs: {
    other: "xx",
    other2: [1, 2],
    include: {
      script: [
        "-npm install -g --production coveralls codecov",
        "cat ./coverage/lcov.info | coveralls",
        "npm install -g --production codecov"
      ]
    }
  }
};

test("travis scripts", t => {
  const originalFragment = {
    jobs: {
      other: "a",
      include: {
        script: ["npm install -g --production coveralls codecov"]
      }
    }
  };

  const messages = [];
  t.deepEqual(merge(originalFragment, templateFragment, undefined, messages), {
    jobs: {
      other: "xx",
      other2: [1, 2],
      include: {
        script: [
          "cat ./coverage/lcov.info | coveralls",
          "npm install -g --production codecov"
        ]
      }
    }
  });

  t.deepEqual(messages, [
    "chore(travis): remove npm install -g --production coveralls codecov from jobs.include.script",
    "chore(travis): add cat ./coverage/lcov.info | coveralls to jobs.include.script",
    "chore(travis): add npm install -g --production codecov to jobs.include.script",
    "chore(travis): add 1,2 to jobs"
  ]);
});
