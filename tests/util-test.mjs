import test from "ava";
import { templateOptions } from "../src/util.mjs";

test("templateOptions matching", t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: "Readme"
            },
            {
              merger: "Package",
              options: { o1: 77 }
            }
          ]
        }
      },
      "Package"
    ),
    { o1: 77 }
  );
});

test("templateOptions empty", t => {
  t.deepEqual(
    templateOptions(
      {
        template: {
          files: [
            {
              merger: "Package",
              options: { o1: 77 }
            }
          ]
        }
      },
      "Readme"
    ),
    {}
  );
});
