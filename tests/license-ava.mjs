import test from "ava";

import { createContext, asyncIterator2scalar } from "./helpers/util.mjs";
import { StringContentEntry, ContentEntry } from "content-entry";
import { License } from "../src/mergers/license.mjs";

async function lmt(t, license, template, year, expected, message) {
  const context = await createContext({
    date: { year },
    license: { owner: "default_owner" }
  });

  const commit = await asyncIterator2scalar(
    License.commits(
      context,
      license === undefined
        ? new ContentEntry("license")
        : new StringContentEntry("license", license),
      template === undefined
        ? new ContentEntry("license")
        : new StringContentEntry("license", template)
    )
  );

  if (commit === undefined) {
    t.is(message, undefined);
    t.is(expected, undefined);
  } else {
    if (message) {
      t.is(commit.message, message, "message");
    }
    t.is(await commit.entries[0].string, expected, "merged content");
  }
}

lmt.title = (providedTitle = "", license, template, year, expected, message) =>
  `license ${providedTitle} ${license} ${year} ${expected || ""}`.trim();

test(
  lmt,
  "Copyright (c) 1999 xyz",
  "Copyright (C) {{license.years}} by {{license.owner}}",
  2017,
  "Copyright (C) 1999,2017 by xyz",
  "chore(license): add year 2017"
);

test(
  lmt,
  "Copyright (c) 1999 by {{license.owner}}",
  "Copyright (C) {{license.years}} by {{license.owner}}",
  2018,
  "Copyright (C) 1999,2018 by default_owner",
  "chore(license): add year 2018"
);

test(
  lmt,
  "Copyright (c) 1999 by xyz",
  "Copyright (C) {{license.years}} by {{license.owner}}",
  2019,
  "Copyright (C) 1999,2019 by xyz",
  "chore(license): add year 2019"
);

test(
  lmt,
  "Copyright (c) 2015-2019 by xyz",
  "Copyright (c) {{license.years}} by {{license.owner}}",
  2020,
  "Copyright (c) 2015-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2014,2015,2016,2017,2018,2019 by xyz",
  "Copyright (c) {{license.years}} by {{license.owner}}",
  2020,
  "Copyright (c) 2014-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2001,1999,2000,2001,2007 by xyz",
  "Copyright (c) {{license.years}} by {{license.owner}}",
  2098,
  "Copyright (c) 1999-2001,2007,2098 by xyz",
  "chore(license): add year 2098"
);

test(
  lmt,
  "Copyright (c) 2015,2017-2020 by xyz",
  "Copyright (c) {{license.years}} by {{license.owner}}",
  2020
);

test(
  lmt,
  undefined,
  "Copyright (c) {{license.years}} by {{license.owner}}",
  2097,
  "Copyright (c) 2097 by default_owner",
  "chore(license): update from template"
);

test(
  lmt,
  "Copyright (C) 2015-2024 by a & b",
  "Copyright (C) {{license.years}} by {{license.owner}}",
  2024
);
