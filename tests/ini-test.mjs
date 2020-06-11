import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { decode } from "../src/ini-encoder.mjs";
import { INI } from "../src/mergers/ini.mjs";
import { EmptyContentEntry, StringContentEntry } from "content-entry";

test("ini merge", async t => {
  const fileName = "a.ini";
  const commit = await INI.merge(
    await createContext({ description: "value" }),
    new StringContentEntry(
      fileName,
      `[Unit]
Description={{description}}
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
`
    ),
    new StringContentEntry(
      fileName,
      `[Unit]
Description={{description}}
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
MemoryAccounting=true
`
    )
  );

  t.deepEqual(decode(await commit.entry.getString()), {
    Unit: {
      Description: "{{description}}",
      After: "network-online.target",
      Wants: "network-online.target"
    },
    Service: {
      Type: "notify",
      MemoryAccounting: true
    }
  });
});

test("ini merge nop", async t => {
  const fileName = "a.ini";
  const commit = await INI.merge(
    await createContext({ description: "value" }),
    new StringContentEntry(
      fileName,
      `[Unit]
After=network-online.target

[Service]
Type=notify
`
    ),
    new StringContentEntry(
      fileName,
      `[Unit]
After=network-online.target

[Service]
Type=notify
`
    )
  );

  t.is(commit,undefined, "no commit");
});

test("ini merge empty dest", async t => {
  const fileName = "a.ini";
  const commit = await INI.merge(
    await createContext({ description: "value" }),
    new EmptyContentEntry(
      fileName),
    new StringContentEntry(
      fileName,
      `[Unit]
After=network-online.target

[Service]
Type=notify
`
    )
  );

  t.deepEqual(decode(await commit.entry.getString()), {
    Unit: {
      After: "network-online.target"
    },
    Service: {
      Type: "notify"
    }
  });
});
