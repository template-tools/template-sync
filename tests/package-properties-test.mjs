import test from "ava";
import { StringContentEntry } from "content-entry";
import { Package } from "../src/mergers/package.mjs";

async function propertiest(
  t,
  factory = Package,
  name = "package.json",
  content,
  expected
) {
  const properties = await factory.properties(
    content === undefined
      ? new EmptyContentEntry(name)
      : new StringContentEntry(name, content)
  );

  t.deepEqual(properties, expected, "properties");
}

propertiest.title = (
  providedTitle = "",
  factory = Package,
  name = "package.json",
  content,
  expected
) => `properties ${factory.name} ${providedTitle} ${content}`.trim();

test(
  propertiest,
  Package,
  "package.json",
  JSON.stringify({ name: "aName", version: "0.0.0-semantic-release" }),
  {
    npm: { name: "aName", fullName: "aName" },
    name: "aName"
  }
);

test(
  propertiest,
  Package,
  "package.json",
  JSON.stringify({ name: "@org/aName" }),
  {
    npm: { name: "aName", fullName: "@org/aName", organization: "@org" },
    name: "aName"
  }
);

test(
  propertiest,
  Package,
  "package.json",
  JSON.stringify({
    name: "aName",
    version: "1.2.3",
    description: "a description",
    main: "index.mjs",
    config: {
      api: "/some/path"
    }
  }),
  {
    npm: { name: "aName", fullName: "aName" },
    //license: { owner: 'tragetUser' },
    description: "a description",
    main: "index.mjs",
    name: "aName",
    version: "1.2.3",
    api: "/some/path"
  }
);
