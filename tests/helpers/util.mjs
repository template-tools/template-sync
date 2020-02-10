import { MockProvider } from "mock-repository-provider";
import { Context } from "../../src/context.mjs";
import { PreparedContext } from "../../src/prepared-context.mjs";

export const TARGET_REPO = "targetRepo";
export const TEMPLATE_REPO = "templateRepo";

export async function createContext(
  template,
  target,
  fileName = "a.txt",
  properties = {}
) {
  const provider = new MockProvider({
    [TEMPLATE_REPO]: {
      master: {
        [fileName]: template
      }
    },
    [TARGET_REPO]: {
      master: {
        [fileName]: target
      }
    }
  });

  return PreparedContext.from(
    new Context(provider, {
      properties,
      templateSources: [TEMPLATE_REPO]
    }),
    TARGET_REPO
  );
}
