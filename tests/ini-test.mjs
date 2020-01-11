import test from "ava";
import { createContext } from "./util.mjs";
import { decode } from "../src/ini-encoder.mjs";
import { INI } from "../src/ini.mjs";

test("ini merge", async t => {
  const fileName = "a.ini";
  const context = await createContext(
    `[Unit]
Description={{description}}
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
`,
    `[Unit]
Description={{description}}
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
MemoryAccounting=true
`,
    fileName,
    { description: "value" }
  );

  const ini = new INI(fileName);
  const merged = await ini.merge(context);

  t.deepEqual(decode(merged.content), {
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
