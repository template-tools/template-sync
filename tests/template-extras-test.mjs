import test from "ava";
import { mergeTemplate } from "../src/template.mjs";

test("mergeTemplateFiles 1", t => {
  t.deepEqual(
    mergeTemplate(
      {
        template: {
          files: [
            {
              merger: "Package"
            }
          ]
        }
      },
      { template: { files: [{ merger: "Package" }] } }
    ),
    { template: { files: [{ merger: "Package" }] } }
  );
});

test("mergeTemplateFiles 2", t => {
  t.deepEqual(
    mergeTemplate(
      {
        template: {
          files: [
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
          ]
        }
      },
      {
        template: {
          files: [
            {
              merger: "Package",
              options: {
                badges: [
                  {
                    name: "npm1",
                    icon: "https://img.shields.io/npm/v/{{name}}1.svg",
                    url: "https://www.npmjs.com/package/{{name}}1"
                  }
                ]
              }
            }
          ]
        }
      }
    ),
    {
      template: {
        files: [
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
                  icon: "https://img.shields.io/npm/v/{{name}}1.svg",
                  url: "https://www.npmjs.com/package/{{name}}1"
                }
              ]
            }
          }
        ]
      }
    }
  );
});
