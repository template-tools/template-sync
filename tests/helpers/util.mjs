import { StringContentEntry, EmptyContentEntry } from "content-entry";
import { MockProvider } from "mock-repository-provider";
import { Context } from "../../src/context.mjs";
import yaml from "js-yaml";

export function asArray(o) {
  return Array.isArray(o) ? o : o === undefined ? [] : [o];
}

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


const FILE_NAME = ".travis.yml";

export async function yamlt(
  t,
  factory,
  template,
  content,
  options,
  expected,
  message
) {
  const context = await createContext({
    template: "templateRepo",
    github: {
      repo: "the-repo-name",
      user: "the-user-name"
    },
    user: "x-user"
  });

  const commit = await factory.merge(
    context,
    content === undefined
      ? new EmptyContentEntry(FILE_NAME)
      : new StringContentEntry(
          FILE_NAME,
          typeof content === "string" ? content : yaml.safeDump(content)
        ),
    template === undefined
      ? new EmptyContentEntry(FILE_NAME)
      : new StringContentEntry(
          FILE_NAME,
          typeof template === "string" ? template : yaml.safeDump(template)
        ),
    { ...factory.defaultOptions, ...options }
  );

  if (message !== undefined) {
    t.is(commit.message, message);
  }

  const result = await commit.entry.getString();

  if (typeof expected === "function") {
    expected(t, yaml.safeLoad(result));
  } else {
    t.deepEqual(
      typeof expected === "string" ? result : yaml.safeLoad(result),
      expected === undefined ? content : expected
    );
  }
}

yamlt.title = (
  providedTitle = "",
  factory,
  template,
  content,
  options,
  expected,
  message = []
) =>
  `${factory.name} ${providedTitle} ${JSON.stringify(
    template
  )} ${content} ${expected}`.trim();

