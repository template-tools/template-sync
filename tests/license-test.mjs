import test from "ava";

import { createContext } from "./helpers/util.mjs";
import { StringContentEntry, EmptyContentEntry } from "content-entry";

import { License } from "../src/mergers/license.mjs";

async function lmt(t, license, year = 2099, expected = "", message = "") {
  const context = await createContext({
    template: "templateRepo",
    properties: {
      date: { year },
      license: { owner: "xyz" }
    }
  });

  const commit = await License.merge(
    context,
    new EmptyContentEntry("license"),
    new StringContentEntry(
      "license",
      "Copyright (c) {{date.year}} by {{license.owner}}"
    )
  );
  t.deepEqual(commit.message, message);
  t.is(await commit.entry.getString(), expected);
}

lmt.title = (
  providedTitle = "",
  license,
  year = 2099,
  expected = "",
  message = ""
) => `license ${providedTitle} ${license} ${expected}`.trim();

test(
  lmt,
  "Copyright (c) 1999 by xyz",
  2099,
  "Copyright (c) 1999,2099 by xyz",
  "chore(license): add year 2099"
);

test(
  lmt,
  "Copyright (c) 2015-2019 by xyz",
  2020,
  "Copyright (c) 2015-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2014,2015,2016,2017,2018,2019 by xyz",
  2020,
  "Copyright (c) 2014-2020 by xyz",
  "chore(license): add year 2020"
);

test(
  lmt,
  "Copyright (c) 2001,1999,2000,2001,2007 by xyz",
  2099,
  "Copyright (c) 1999-2001,2007,2099 by xyz",
  "chore(license): add year 2099"
);

test(
  lmt,
  "Copyright (c) 2015,2017-2020 by xyz",
  2020,
  "Copyright (c) 2015,2017-2020 by xyz",
  "chore(license): update"
);

test(
  lmt,
  undefined,
  2099,
  "Copyright (c) 2099 by myOwner",
  "chore(license): add LICENSE"
);
