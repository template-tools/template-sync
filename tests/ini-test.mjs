import test from "ava";
import { createContext } from "./helpers/util.mjs";
import { decode } from "../src/ini-encoder.mjs";
import { INI } from "../src/mergers/ini.mjs";
import { StringContentEntry } from "content-entry";

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
