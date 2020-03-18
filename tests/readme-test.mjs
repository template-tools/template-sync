import test from "ava";
import { MockProvider } from "mock-repository-provider";

import { createContext } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";

import { Readme } from "../src/mergers/readme.mjs";
import { Package } from "../src/mergers/package.mjs";

test("readme default options", t => {
  t.deepEqual(Readme.defaultOptions.badges, []);
});

test("readme", async t => {
  const commit = await Readme.merge(
    await createContext(),
    new StringContentEntry(
      "readme.md",
      `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)

[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)
[![Badge 2](http://domain.net/somewhere2.svg)](http://domain.net/somewhere2)

body
body`
    ),
    new StringContentEntry("xx", ""),
    {
      badges: [
        {
          name: "Badge 1",
          icon: "http://domain.net/somewhere1.svg",
          url: "http://domain.net/somewhere1",
          order: 0.1
        }
      ]
    }
  );

  t.is(
    await commit.entry.getString(),
    `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)


body
body`
  );
});
