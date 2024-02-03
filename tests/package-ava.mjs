import test from "ava";
import { StringContentEntry, EmptyContentEntry } from "content-entry";
import {
  createContext,
  asArray,
  asyncIterator2scalar
} from "./helpers/util.mjs";

import { Package } from "../src/mergers/package.mjs";

const FILE_NAME = "package.json";

async function pkgt(
  t,
  template,
  content,
  properties,
  options,
  expected,
  message
) {
  const context = await createContext({
    template: "templateRepo",
    github: {
      repo: "the-repo-name",
      user: "the-user-name"
    },
    user: "x-user",
    ...properties
  });

  context.template.mergers.unshift({
    factory: Package,
    options: Package.options,
    pattern: Package.pattern
  });

  // also fill mock repo
  if (content !== undefined) {
    const branch = await context.provider.branch("targetUser/targetRepo");
    branch.files[FILE_NAME] = JSON.stringify(content);
  }

  const commit = await asyncIterator2scalar(
    Package.commits(
      context,
      content === undefined
        ? new EmptyContentEntry(FILE_NAME)
        : new StringContentEntry(FILE_NAME, JSON.stringify(content)),
      template === undefined
        ? new EmptyContentEntry(FILE_NAME)
        : new StringContentEntry(FILE_NAME, JSON.stringify(template)),
      { ...Package.options, ...options }
    )
  );

  for (const e of asArray(message)) {
    if (e instanceof RegExp) {
      t.regex(commit.message, e, "commit message");
    } else if (message !== undefined) {
      t.is(commit.message, e, "commit message");
    }
  }

  if (typeof expected === "function") {
    expected(t, JSON.parse(await commit.entries[0].string));
  } else {
    t.deepEqual(
      JSON.parse(await commit.entries[0].string),
      expected === undefined ? content : expected,
      "commit content"
    );
  }
}

pkgt.title = (
  providedTitle = "",
  template,
  content,
  properties,
  options,
  expected,
  message
) =>
  `package ${providedTitle} ${JSON.stringify(template)} ${JSON.stringify(
    content
  )}`.trim();

test(
  "empty bugs results in no change",
  pkgt,
  {},
  {
    name: "targetRepo",
    repository: {
      type: "git",
      url: "git+http://mock-provider.com/targetUser/targetRepo.git"
    },
    bugs: { url: "http://mock-provider.com/targetUser/targetRepo/issues" },
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    template: {
      inheritFrom: "templateRepo"
    }
  },
  undefined,
  undefined,
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
  undefined,
  undefined,
  {
    name: "targetRepo",
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    repository: {
      type: "git",
      url: "git+http://mock-provider.com/targetUser/targetRepo.git"
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
      url: "git+http://mock-provider.com/targetUser/targetRepo.git"
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
  undefined,
  undefined,

  {
    name: "targetRepo",
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    repository: {
      type: "git",
      url: "git+http://mock-provider.com/targetUser/targetRepo.git"
    },
    template: {
      inheritFrom: "templateRepo"
    }
  },
  ["chore(package): (dependencies)", "chore(package): (repository)"].join("\n")
);

test(
  "skip lower versions engines",
  pkgt,
  {
    engines: {
      node: ">=8"
    }
  },
  {
    engines: {
      node: ">=10"
    }
  },
  undefined,
  undefined,

  (t, merged) => {
    t.deepEqual(merged.engines, {
      node: ">=10"
    });
  }
);

test(
  "breaking engines",
  pkgt,
  {
    engines: {
      node: ">=12"
    }
  },
  {
    engines: {
      node: ">=10"
    }
  },
  undefined,
  undefined,

  (t, merged) => {
    t.deepEqual(merged.engines, {
      node: ">=12"
    });
  },
  /BREAKING CHANGE:/
);

test(
  "delete entries",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.slot, {
      add: 2,
      preserve: 3
    });
  },
  /slot.something/
);

test(
  "preserve extra prepare",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.scripts, {
      prepare: "rollup x y && chmod +x bin/xx",
      preprocess: "rollup a && chmod +x bin/yy"
    });
  }
);

test(
  "handle missing scripts in template",
  pkgt,
  {
    scripts: {
      prepare: "rollup"
    }
  },
  {},
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.scripts, {
      prepare: "rollup"
    });
  }
);

test(
  "bin with expander",
  pkgt,
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
  },
  { name: "myName" },
  undefined,
  (t, merged) => {
    t.deepEqual(merged.bin, {
      a: "bin/a",
      myName: "bin/myName",
      "myName-systemd": "bin/myName-systemd"
    });
  }
);

test(
  "devDependencies keep cracks",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, {
      cracks: "3.1.2"
    });
  }
);

test(
  "devDependencies remove cracks",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, { special: "1.0.0" });
  }
);

test(
  "devDependencies",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, {
      b: "1",
      c: "1",
      e: "2"
    });
  },
  [/remove\s+1.+devDependencies.a/, /add\s+1.+devDependencies.c/]
);

test(
  "dependencies only increase",
  pkgt,
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
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, {
      a: "^0.25.1",
      b: "^1.0.0-beta.5.1",
      c: "0.25.0",
      d: "~0.24.9"
    });
  }
);

test(
  "update dependencies => fix",
  pkgt,
  {
    dependencies: {
      a: "^2.0.0"
    }
  },
  {
    dependencies: {
      a: "^1.0.0"
    },
    name: "targetRepo",
    repository: {
      type: "git",
      url: "git+http://mock-provider.com/targetUser/targetRepo.git"
    },
    bugs: {
      url: "http://mock-provider.com/targetUser/targetRepo/issues"
    },
    homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
    template: {
      inheritFrom: "templateRepo"
    }
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.dependencies, {
      a: "^2.0.0"
    });
  },
  [/fix\(deps\):.*add.*2.0.0.*dependencies\.a/]
);

test(
  "dependencies increase beta <> rc",
  pkgt,
  {
    devDependencies: {
      a: "^1.0.0-rc.1"
    }
  },
  {
    devDependencies: {
      a: "^1.0.0-beta.8"
    }
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, {
      a: "^1.0.0-rc.1"
    });
  }
);

test(
  "dependencies git",
  pkgt,
  {
    devDependencies: {
      a: "git+https://github.com/arlac77/light-server.git"
    }
  },
  {
    devDependencies: {
      a: "^1.0.0-rc.1"
    }
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.devDependencies, {
      a: "git+https://github.com/arlac77/light-server.git"
    });
  }
);

test(
  "keywords",
  pkgt,
  {},
  {
    name: "abc_xxx_1",
    template: {
      inheritFrom: "https://github.com/.git"
    },
    keywords: ["A", "B"]
  },
  undefined,
  {
    keywords: {
      _xxx_: "X"
    }
  },
  (t, merged) => {
    t.deepEqual(merged.keywords, ["A", "B", "X"]);
  },
  /add X.*keywords/
);

test(
  "keywords empty",
  pkgt,
  {},
  {
    name: "abc_xxx_1"
  },
  undefined,
  {
    keywords: {
      _xxx_: "XXX"
    }
  },
  (t, merged) => {
    t.deepEqual(merged.keywords, ["XXX"]);
  },
  /docs\(package\): \(keywords/
);

test(
  "remove null keyword",
  pkgt,
  {
    template: {}
  },
  {
    name: "abc_xxx_1",
    keywords: [null, ""]
  },
  undefined,
  undefined,
  (t, merged) => {
    t.is(merged.keywords, undefined);
  },
  /docs\(package\):\s+remove\s+\(keywords/
);

test(
  "remove unexpanded {{xxx}}",
  pkgt,
  {
    template: {}
  },
  {
    browser: "{{browser}}",
    main: "a value"
  },
  undefined,
  undefined,
  (t, merged) => {
    t.true(merged.browser === undefined);
    t.true(merged.main === "a value");
  },
  /chore\(package\): remove {{browser}} \(browser\)/
);

test(
  "add xo/space=true",
  pkgt,
  {
    xo: {
      space: true
    }
  },
  {
    xo: {
      space: true
    }
  },
  undefined,
  undefined,
  (t, merged) => {
    t.deepEqual(merged.xo, {
      space: true
    });
  }
);

test(
  "jsonpath",
  pkgt,
  {
    nyc: {
      "report-dir": "./build/coverage"
    }
  },
  {
    nyc: {
      "report-dir": "./coverage"
    }
  },
  { actions: [{ path: "$.nyc['report-dir']", op: "replace" }] },
  undefined,
  (t, merged) => {
    t.deepEqual(merged.nyc, {
      "report-dir": "./build/coverage"
    });
  },
  /add .\/build\/coverage.*nyc.report-dir/
);

test("start fresh", pkgt, undefined, undefined, undefined, undefined, {
  name: "targetRepo",
  homepage: "http://mock-provider.com/targetUser/targetRepo#readme",
  bugs: {
    url: "http://mock-provider.com/targetUser/targetRepo/issues"
  },
  repository: {
    type: "git",
    url: "git+http://mock-provider.com/targetUser/targetRepo.git"
  }
  /*,
  template: {
    inheritFrom: "templateRepo"
  }*/
});
