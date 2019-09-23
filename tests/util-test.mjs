import test from "ava";
import { templateOptions, mergeTemplateFiles } from "../src/util.mjs";

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

test("mergeTemplateFiles 1", t => {
  t.deepEqual(
    mergeTemplateFiles(
      [
        {
          merger: "Package"
        }
      ],
      [{ merger: "Package" }]
    ),
    [{ merger: "Package" }]
  );
});

test("mergeTemplateFiles 2", t => {
  t.deepEqual(
    mergeTemplateFiles(
      [
        {
          merger: "Package",
          options: {
            badges: [
              {
                name: "npm",
                icon: "https://img.shields.io/npm/v/{{name}}.svg",
                url: "https://www.npmjs.com/package/{{name}}"
              }
            ]
          }
        }
      ],
      [
        {
          merger: "Package",
          options: {
            badges: [
              {
                name: "npm1",
                icon: "https://img.shields.io/npm/v/{{name}}.svg",
                url: "https://www.npmjs.com/package/{{name}}"
              }
            ]
          }
        }
      ]
    ),
    [
      {
        merger: "Package",
        options: {
          badges: [
            {
              name: "npm",
              icon: "https://img.shields.io/npm/v/{{name}}.svg",
              url: "https://www.npmjs.com/package/{{name}}"
            },
            {
              name: "npm1",
              icon: "https://img.shields.io/npm/v/{{name}}.svg",
              url: "https://www.npmjs.com/package/{{name}}"
            }
          ]
        }
      }
    ]
  );
});
