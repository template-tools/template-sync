import test from "ava";
import { mergeTemplate } from "../src/template.mjs";

test("mergeTemplateFiles 1", t => {
  t.deepEqual(
    mergeTemplate(
      {
        template: {
          mergers: [
            {
              type: "Package"
            }
          ]
        }
      },
      { template: { mergers: [{ type: "Package" }] } }
    ),
    { template: { mergers: [{ type: "Package" }] } }
  );
});

test("mergeTemplateFiles 2", t => {
  t.deepEqual(
    mergeTemplate(
      {
        template: {
          mergers: [
            {
              type: "Package",
              options: {
                badges: [
                  {
                    name: "npm",
                    icon: "https://img.shields.io/npm/v/{{name}}.svg",
                    url: "https://www.npmjs.com/package/{{name}}",
                    order: 0.1
                  }
                ]
              }
            }
          ]
        }
      },
      {
        template: {
          mergers: [
            {
              type: "Package",
              options: {
                badges: [
                  {
                    name: "npm1",
                    icon: "https://img.shields.io/npm/v/{{name}}1.svg",
                    url: "https://www.npmjs.com/package/{{name}}1",
                    order: 0.05
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
        mergers: [
          {
            type: "Package",
            options: {
              badges: [
                {
                  name: "npm",
                  icon: "https://img.shields.io/npm/v/{{name}}.svg",
                  url: "https://www.npmjs.com/package/{{name}}",
                  order: 0.1
                },
                {
                  name: "npm1",
                  icon: "https://img.shields.io/npm/v/{{name}}1.svg",
                  url: "https://www.npmjs.com/package/{{name}}1",
                  order: 0.05
                }
              ]
            }
          }
        ]
      }
    }
  );
});
