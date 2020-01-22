import test from "ava";
import { MockProvider } from "mock-repository-provider";
import { Template } from "../src/template.mjs";

function createTemplate(args) {
  const template = new Template(
    new MockProvider({
      template: {
        master: {
          "package.json": JSON.stringify({
            devDependencies: { ava: "^2.4.0" },
            template: { inheritFrom: ["template_b"] }
          })
        }
      },
      template_b: {
        master: {
          "package.json": JSON.stringify({
            devDependencies: { rollup: "^1.29.1" }
          })
        }
      }
    }),
    args
  );

  return template;
}

/*
async function tt(t) {
}

tt.title = (providedTitle = "") =>
  `template ${providedTitle}`.trim();
*/

test("template constructor", t => {
  const template = createTemplate("template");

  t.deepEqual(template.templates, ["template"]);
  t.is(`${template}`, "template");
});

test("template", async t => {
  const template = createTemplate("template");

  t.deepEqual(await template.package(), {
    devDependencies: { ava: "^2.4.0", rollup: "^1.29.1" },
    template: { inheritFrom: ["template_b"] }
  });
});
