import { MockProvider } from "mock-repository-provider";
import { Context } from "../../src/context.mjs";

export const TARGET_REPO = "targetUser/targetRepo";
export const TEMPLATE_REPO = "templateRepo";

export async function createContext(
  properties = {}
) {
  const provider = new MockProvider({
    [TEMPLATE_REPO]: {
      master: {
      }
    },
    [TARGET_REPO]: {
      master: {
      }
    }
  });

  return Context.from(provider, TARGET_REPO, {
    properties,
    template: TEMPLATE_REPO
  });
}
