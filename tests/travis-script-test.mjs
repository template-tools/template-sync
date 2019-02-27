import test from "ava";
import { merge } from "../src/travis";

const templateFragment = {
  jobs: {
    other: "xx",
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
      include: {
        script: ["npm install -g --production coveralls codecov"]
      }
    }
  };

  t.deepEqual(merge(originalFragment, templateFragment), {
    jobs: {
      other: "xx",
      include: {
        script: [
          "cat ./coverage/lcov.info | coveralls",
          "npm install -g --production codecov"
        ]
      }
    }
  });
});
