import test from "ava";
import { StringContentEntry } from "content-entry";
import { Package } from "../src/mergers/package.mjs";

test("package extract properties not 0.0.0-semantic-release", async t => {
    const properties = await Package.properties(
      new StringContentEntry(
        "package.json",
        JSON.stringify({ name: "aName", version: "0.0.0-semantic-release" })
      )
    );
  
    t.deepEqual(properties, {
      npm: { name: "aName", fullName: "aName" },
      name: "aName"
    });
  });
  
  test("package extract properties", async t => {
    const properties = await Package.properties(
      new StringContentEntry(
        "package.json",
        JSON.stringify({
          name: "aName",
          version: "1.2.3",
          description: "a description",
          module: "a module",
          config: {
            api: "/some/path"
          }
        })
      )
    );
  
    t.deepEqual(properties, {
      npm: { name: "aName", fullName: "aName" },
      //license: { owner: 'tragetUser' },
      description: "a description",
      module: "a module",
      name: "aName",
      version: "1.2.3",
      api: "/some/path"
    });
  });
    