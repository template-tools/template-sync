import test from "ava";
import { MockProvider } from "mock-repository-provider";
import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";
import { Markdown } from "../src/markdown.mjs";
const FILE_NAME = "a.md";

async function createContext(template, target) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        [FILE_NAME]: template
      }
    },
    targetRepo: {
      master: {
        [FILE_NAME]: target
      }
    }
  });

  return PreparedContext.from(
    new Context(provider, {
      properties: { description: "value" },
      templates: ["templateRepo"]
    }),
    "targetRepo"
  );
}


test.skip("markdown merge", async t => {
  const context = await createContext(
    `
# Hello
`,
    `
# Hello

- a
- b
- c
`
  );

  const md = new Markdown(FILE_NAME, { expand: true });
  const merged = await md.merge(context);

  t.is(merged.content, `
# Hello
`);
});
