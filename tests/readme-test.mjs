import test from "ava";

import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry } from "content-entry";

import { Readme } from "../src/mergers/readme.mjs";

test("readme default options", t => {
  t.deepEqual(Readme.options.badges, []);
});

test("readme", async t => {
  const commit = await asyncIterator2scalar(
    Readme.commits(
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
    )
  );

  t.is(
    await commit.entries[0].getString(),
    `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)


body
body`
  );
});

test("readme nop", async t => {
  const commit = await asyncIterator2scalar(
    Readme.commits(
      await createContext(),
      new StringContentEntry(
        "readme.md",
        `[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)

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
    )
  );

  t.is(commit, undefined);
});
