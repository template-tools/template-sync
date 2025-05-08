import test from "ava";
import { StringContentEntry, ContentEntry } from "content-entry";
import { Package } from "../src/mergers/package.mjs";

async function propertyt(
  t,
  factory = Package,
  name = "package.json",
  content,
  expected
) {
  const properties = await factory.properties(
    content === undefined
      ? new ContentEntry(name)
      : new StringContentEntry(name, undefined, content)
  );

  t.deepEqual(properties, expected, "properties");
}

propertyt.title = (
  providedTitle = "",
  factory = Package,
  name = "package.json",
  content,
  expected
) => `properties ${factory.name} ${providedTitle} ${content}`.trim();

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({ name: "aName", version: "0.0.0-semantic-release" }),
  {
    npm: { name: "aName", fullName: "aName" },
    name: "aName",
    fullName: "aName"
  }
);

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({ name: "@org/aName" }),
  {
    npm: { name: "aName", fullName: "@org/aName", organization: "@org" },
    fullName: "@org/aName",
    name: "aName"
  }
);

test(
  propertyt,
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
    fullName: "aName",
    version: "1.2.3",
    api: "/some/path"
  }
);

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({
    exports: {
      ".": "index.mjs"
    }
  }),
  {
    main: "index.mjs"
  }
);

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({
    exports: {
      other: "xyz",
      default: "index.mjs"
    }
  }),
  {
    main: "index.mjs"
  }
);

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({
    exports: {
      ".": {
        default: "./index.mjs",
        types: "./types/index.d.mts"
      }
    }
  }),
  {
    main: "./index.mjs"
  }
);

test(
  propertyt,
  Package,
  "package.json",
  JSON.stringify({
    exports: {
      ".": {
        default: "./src/module.mjs",
        svelte: "./src/index.svelte",
        types: "./types/module.d.mjs"
      },
      "./css": "./src/common.css"
    }
  }),
  {
    main: "./src/module.mjs"
  }
);
