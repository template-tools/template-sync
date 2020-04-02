import test from "ava";

import { createContext } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";

import { License } from "../src/mergers/license.mjs";

async function lmt(t, license, template, year, expected, message) {
  const context = await createContext({
    date: { year },
    license: { owner: "xyz" }
  });

  const commit = await License.merge(
    context,
    license === undefined
      ? new EmptyContentEntry("license")
      : new StringContentEntry("license", license),
    template === undefined
      ? new EmptyContentEntry("license")
      : new StringContentEntry("license", template)
  );

  if (commit === undefined) {
    t.is(message, undefined);
    t.is(expected, undefined);
  } else {
    t.is(commit.message, message, "message");
    t.is(await commit.entry.getString(), expected, "merged content");
  }
}

lmt.title = (providedTitle = "", license, template, year, expected, message) =>
  `license ${providedTitle} ${license} ${year} ${expected}`.trim();

test(
  lmt,
  "Copyright (c) 1999 by xyz",
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2099,
  "Copyright (c) 1999,2099 by xyz",
  "chore(license): add year 2099"
);

test(
  lmt,
  "Copyright (c) 2015-2019 by xyz",
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2020,
  "Copyright (c) 2015-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2014,2015,2016,2017,2018,2019 by xyz",
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2020,
  "Copyright (c) 2014-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2001,1999,2000,2001,2007 by xyz",
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2098,
  "Copyright (c) 1999-2001,2007,2098 by xyz",
  "chore(license): add year 2098"
);

test(
  lmt,
  "Copyright (c) 2015,2017-2020 by xyz",
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2020
);

test(
  lmt,
  undefined,
  "Copyright (c) {{date.year}} by {{license.owner}}",
  2097,
  "Copyright (c) 2097 by xyz",
  "chore(license): update from template"
);
