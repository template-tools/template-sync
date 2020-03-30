import test from "ava";
import { StringContentEntry } from "content-entry";
import { createContext } from "./helpers/util.mjs";

import { Package } from "../src/mergers/package.mjs";

const FILE_NAME = "package.json";

async function pkgt(t, template, content, expected, message) {
  const context = await createContext({
    template: "templateRepo",
    github: {
      repo: "the-repo-name",
      user: "the-user-name"
    },
    user: "x-user"
  });

  const commit = await Package.merge(
    context,
    new StringContentEntry(FILE_NAME, JSON.stringify(content)),
    new StringContentEntry(FILE_NAME, JSON.stringify(template))
  );

  t.is(commit.message, message);

  t.deepEqual(
    JSON.parse(await commit.entry.getString()),
    expected === undefined ? content : expected
  );
}

pkgt.title = (providedTitle = "", template, content, expected, message = []) =>
  `package ${providedTitle} ${JSON.stringify(
    template
  )} ${content} ${expected}`.trim();

test(
  "empty bugs results in no change",
  pkgt,
  {},
  {
    name: "targetRepo",
    repository: {
      type: "git",
      url: "http://mock-provider.com/targetUser/targetRepo"
    },
    bugs: { url: "http://mock-provider.com/targetUser/targetRepo/issues" },
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    template: {
      inheritFrom: "templateRepo"
    }
  },
  undefined,
  "merge from template package.json"
);

test(
  "repository change only",
  pkgt,
  {},
  {
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  },
  {
    name: "targetRepo",
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    repository: {
      type: "git",
      url: "http://mock-provider.com/targetUser/targetRepo"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  },
  "chore(package): (repository)"
);

test(
  "remove empty deps",
  pkgt,
  {
    dependencies: {},
    repository: {
      type: "git",
      url: "http://mock-provider.com/targetUser/targetRepo"
    }
  },
  {
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  },
  {
    name: "targetRepo",
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    repository: {
      type: "git",
      url: "http://mock-provider.com/targetUser/targetRepo"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  },
  ["chore(package): (dependencies)", "chore(package): (repository)"].join("\n")
);

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

test("package merge engines (skip lower versions in template)", async t => {
  const context = await createContext(
    {
      engines: {
        node: ">=8"
      }
    },
    {
      engines: {
        node: ">=10"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).engines, {
    node: ">=10"
  });
});

test("delete entries", async t => {
  const context = await createContext(
    {
      slot: {
        something: "--delete--",
        add: 2
      },
      other: "--delete--"
    },
    {
      slot: {
        something: {
          a: 1
        },
        preserve: 3
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).slot, {
    add: 2,
    preserve: 3
  });

  t.false(merged.messages.includes("chore(package): delete other"));
  t.true(merged.messages.includes("chore(package): (slot.something)"));
});

test("package preserve extra prepare", async t => {
  const context = await createContext(
    {
      scripts: {
        prepare: "rollup x y && chmod +x bin/xx",
        preprocess: "rollup a"
      }
    },
    {
      scripts: {
        prepare: "rollup x y && chmod +x bin/xx",
        preprocess: "rollup a && chmod +x bin/yy"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).scripts, {
    prepare: "rollup x y && chmod +x bin/xx",
    preprocess: "rollup a && chmod +x bin/yy"
  });
});

test("package handle missing scripts in template", async t => {
  const context = await createContext(
    {
      scripts: {
        prepare: "rollup"
      }
    },
    {}
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).scripts, {
    prepare: "rollup"
  });
});

test("package bin with expander", async t => {
  const context = await createContext(
    {
      bin: {
        a: "bin/a"
      }
    },
    {
      bin: {
        "{{name}}": "bin/{{name}}",
        "{{name}}-systemd": "bin/{{name}}-systemd"
      }
    }
  );

  context.properties.name = "myName";

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).bin, {
    a: "bin/a",
    myName: "bin/myName",
    "myName-systemd": "bin/myName-systemd"
  });
});

test("package devDependencies keep cracks", async t => {
  const context = await createContext(
    {
      devDependencies: {}
    },
    {
      release: {
        verifyRelease: "cracks"
      },
      devDependencies: {
        cracks: "3.1.2",
        "dont-crack": "1.0.0"
      }
    }
  );

  const pkg = new Package("package.json");
  context.addFile(pkg);

  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    cracks: "3.1.2"
  });
});

test("package devDependencies remove cracks", async t => {
  const context = await createContext(
    {
      devDependencies: {
        special: "1.0.0"
      }
    },
    {
      devDependencies: {
        cracks: "3.1.2",
        "dont-crack": "1.0.0"
      }
    }
  );

  const pkg = new Package("package.json");
  context.addFile(pkg);
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, { special: "1.0.0" });
  //t.true(merged.messages.includes('chore(devDependencies): remove cracks'));
});

test("package devDependencies", async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: "--delete--",
        c: "1",
        d: "--delete--",
        e: "1"
      }
    },
    {
      devDependencies: {
        a: "1",
        b: "1",
        e: "2"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    b: "1",
    c: "1",
    e: "2"
  });

  t.true(
    merged.messages.includes("chore(package): remove 1 (devDependencies.a)") &&
      merged.messages.includes("chore(package): add 1 (devDependencies.c)")
  );
});

test("package dependencies only increase", async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: "0.25.0",
        b: "0.25.0",
        c: "0.25.0"
      }
    },
    {
      devDependencies: {
        a: "^0.25.1",
        b: "^1.0.0-beta.5.1",
        c: "^0.24.9",
        d: "~0.24.9"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    a: "^0.25.1",
    b: "^1.0.0-beta.5.1",
    c: "0.25.0",
    d: "~0.24.9"
  });
});

test("package dependencies increase beta <> rc", async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: "^1.0.0-rc.1"
      }
    },
    {
      devDependencies: {
        a: "^1.0.0-beta.8"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    a: "^1.0.0-rc.1"
  });
});

test("package dependencies git", async t => {
  const context = await createContext(
    {
      devDependencies: {
        a: "git+https://github.com/arlac77/light-server.git"
      }
    },
    {
      devDependencies: {
        a: "^1.0.0-rc.1"
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).devDependencies, {
    a: "git+https://github.com/arlac77/light-server.git"
  });
});

test("package keywords", async t => {
  const context = await createContext(
    {},
    {
      name: "abc_xxx_1",
      template: {
        inheritFrom: "https://github.com/.git"
      },
      keywords: ["A", "B"]
    }
  );

  const pkg = new Package("package.json", {
    keywords: {
      _xxx_: "X"
    }
  });
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, ["A", "B", "X"]);
  t.true(merged.messages.includes("docs(package): add X (keywords)"));
});

test("package keywords empty", async t => {
  const context = await createContext(
    {},
    {
      name: "abc_xxx_1"
    }
  );

  const pkg = new Package("package.json", {
    keywords: {
      _xxx_: "XXX"
    }
  });
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).keywords, ["XXX"]);

  t.true(merged.messages.includes("docs(package): (keywords)"));
});

test("package remove null keyword", async t => {
  const context = await createContext(
    {
      template: {}
    },
    {
      name: "abc_xxx_1",
      keywords: [null, ""]
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.is(JSON.parse(merged.content).keywords, undefined);
  t.true(merged.messages.includes("docs(package): remove  (keywords)"));
});

test("package remove unexpanded {{xxx}}", async t => {
  const context = await createContext(
    {
      template: {}
    },
    {
      browser: "{{browser}}",
      main: "a value"
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  const result = JSON.parse(merged.content);

  t.true(result.browser === undefined);
  t.true(result.main === "a value");
  t.true(
    merged.messages.includes(
      "chore(package): remove unknown value for browser ({{browser}})"
    )
  );
});

test("add xo/space=true", async t => {
  const context = await createContext(
    {
      xo: {
        space: true
      }
    },
    {
      xo: {
        space: true
      }
    }
  );

  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).xo, {
    space: true
  });
  //t.true(merged.messages.includes('chore: update package.json'));
});

test("jsonpath", async t => {
  const context = await createContext(
    {
      nyc: {
        "report-dir": "./build/coverage"
      }
    },
    {
      nyc: {
        "report-dir": "./coverage"
      }
    }
  );

  const pkg = new Package("package.json", {
    actions: [{ path: "$.nyc['report-dir']", op: "replace" }]
  });
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content).nyc, {
    "report-dir": "./build/coverage"
  });

  t.true(
    merged.messages.includes(
      "chore(package): add ./build/coverage (nyc.report-dir)"
    )
  );
});

test("package start fresh", async t => {
  const context = await createContext({});
  const pkg = new Package("package.json");
  const merged = await pkg.merge(context);

  t.deepEqual(JSON.parse(merged.content), {
    name: "targetRepo",
    homepage: "http://mock-provider.com/tragetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/tragetUser/targetRepo/issues"
    },
    repository: {
      type: "git",
      url: "http://mock-provider.com/tragetUser/targetRepo"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  });
});
