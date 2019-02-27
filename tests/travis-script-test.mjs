import test from "ava";
import { mergeScripts } from "../src/travis";

const templateFragment = {
  jobs: {
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

  t.deepEqual(mergeScripts(originalFragment, templateFragment), {
    jobs: {
      include: {
        script: [
          "cat ./coverage/lcov.info | coveralls",
          "npm install -g --production codecov"
        ]
      }
    }
  });
});
