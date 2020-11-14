import { StringContentEntry, EmptyContentEntry } from "content-entry";
import MockProvider from "mock-repository-provider";
import { Context } from "../../src/context.mjs";
import yaml from "js-yaml";

export function asArray(o) {
  return Array.isArray(o) ? o : o === undefined ? [] : [o];
}

export async function asyncIterator2scalar(i) {
  for await (const x of i) {
    return x;
  }
}

export const TARGET_REPO = "targetUser/targetRepo";
export const TEMPLATE_REPO = "templateRepo";

export async function createContext(properties = {}) {
  const provider = new MockProvider({
    [TEMPLATE_REPO]: {
      master: {}
    },
    [TARGET_REPO]: {
      master: {}
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
  properties,
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
    user: "x-user",
    ...properties
  });

  const commit = await asyncIterator2scalar(
    factory.commits(
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
      { ...factory.options, ...options }
    )
  );

  if (message !== undefined) {
    t.is(commit.message, message);
  }

  const result = await commit.entries[0].getString();

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
  properties,
  options,
  expected,
  message = []
) =>
  `${factory.name} ${providedTitle} ${
    template && template.trim ? template.trim() : ""
  } ${content && content.trim ? content.trim() : ""} ${expected}`.trim();
