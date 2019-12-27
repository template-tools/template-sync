import test from "ava";
import { MockProvider } from "mock-repository-provider";
import { decode } from "../src/ini-encoder.mjs";

import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";
import { INI } from "../src/ini.mjs";

const FILE_NAME = "a.ini";

async function createContext(template, target) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        [FILE_NAME]: template
      }
    },
    targetRepo: {
      master: {
        [FILE_NAME]: target
      }
    }
  });

  return PreparedContext.from(
    new Context(provider, {
      properties: {},
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );
}

test("ini merge", async t => {
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
`
  );

  const ini = new INI(FILE_NAME);
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
