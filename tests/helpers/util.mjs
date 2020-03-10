import { MockProvider } from "mock-repository-provider";
import { Context } from "../../src/context.mjs";

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

  return Context.from(provider, TARGET_REPO, {
    properties,
    template: TEMPLATE_REPO
  });
}
