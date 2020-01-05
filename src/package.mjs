import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  compareWithDefinedOrder
} from "hinted-tree-merger";
import { File } from "./file.mjs";
import {
  actions2messages,
  aggregateActions,
  jspath,
  defaultEncodingOptions
} from "./util.mjs";

function moduleNames(object) {
  if (object === undefined) return new Set();

  const modules = new Set();

  Object.keys(object).forEach(k => {
    const v = object[k];
    if (typeof v === "string") {
      modules.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(e => {
        if (typeof e === "string") {
          modules.add(e);
        }
      });
    }
  });

  return modules;
}

/**
 * order in which json keys are written
 */
const sortedKeys = [
  "name",
  "version",
  "private",
  "publishConfig",
  "files",
  "sideEffects",
  "type",
  "main",
  "umd:main",
  "jsdelivr",
  "unpkg",
  "module",
  "source",
  "jsnext:main",
  "browser",
  "svelte",
  "description",
  "keywords",
  "author",
  "maintainers",
  "contributors",
  "license",
  "sustainability",
  "bin",
  "scripts",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "bundledDependencies",
  "engines",
  "os",
  "cpu",
  "arch",
  "repository",
  "directories",
  "files",
  "man",
  "bugs",
  "homepage",
  "config",
  "systemd",
  "pacman",
  "release",
  "ava",
  "nyc",
  "xo",
  "template"
];

const propertyKeys = [
  "description",
  "version",
  "name",
  "main",
  "module",
  "browser"
];

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const REMOVE_HINT = { compare, removeEmpty: true };

const DEPENDENCY_HINT = {
  merge: mergeVersionsLargest,
  type: "chore",
  scope: "package"
};

/**
 * Merger for package.json
 */
export class Package extends File {
  static get defaultOptions() {
    return {
      actions: [],
      keywords: []
    };
  }

  static matchesFileName(name) {
    return name.match(/^package\.json$/);
  }

  optionalDevModules(modules = new Set()) {
    return new Set(["cracks", "dont-crack"].filter(m => modules.has(m)));
  }

  async usedDevModules(content) {
    content = await content;

    const pkg = content.length === 0 ? {} : JSON.parse(content);

    return moduleNames(pkg.release);
  }

  /**
   * Deliver some key properties
   * @param {Branch} branch
   * @return {Object}
   */
  async properties(branch) {
    const content = await branch.maybeEntry(this.name);
    if (content === undefined) {
      return {};
    }

    const pkg = JSON.parse(await content.getString(defaultEncodingOptions));

    const properties = {
      npm: { name: pkg.name, fullName: pkg.name }
    };

    if (pkg.name !== undefined) {
      const m = pkg.name.match(/^(\@[^\/]+)\/(.*)/);
      if (m) {
        properties.npm.organization = m[1];
        properties.npm.name = m[2];
      }
    }

    if (pkg.template !== undefined) {
      if (pkg.template.repository !== undefined) {
        properties.templateRepo = pkg.template.repository.url;
      }
      if (pkg.template.usedBy !== undefined) {
        properties.usedBy = pkg.template.usedBy;
      }
    }

    propertyKeys.forEach(key => {
      if (pkg[key] !== undefined && pkg[key] !== `{{${key}}}`) {
        if (!(key === "version" && pkg[key] === "0.0.0-semantic-release")) {
          properties[key] = pkg[key];
        }
      }
    });

    Object.assign(properties, pkg.config);

    return properties;
  }

  async mergeContent(context, original, templateContent) {
    const originalLastChar = original[original.length - 1];
    const targetRepository = context.targetBranch.repository;

    let target =
      original === undefined || original === "" ? {} : JSON.parse(original);

    target = context.expand(target);

    const template = context.expand({
      ...JSON.parse(templateContent),
      repository: {
        type: targetRepository.type,
        url: targetRepository.url
      },
      bugs: {
        url: context.targetBranch.issuesURL
      },
      homepage: context.targetBranch.homePageURL,
      template: {
        repository: {
          url: context.templateBranch.url
        }
      }
    });

    const properties = context.properties;

    if (target.name === undefined || target.name === "") {
      const m = targetRepository.name.match(/^([^\/]+)\/(.*)/);
      target.name = m ? m[2] : context.targetBranch.repository.name;
    }

    if (target.module !== undefined && !target.module.match(/\{\{module\}\}/)) {
      properties.module = target.module;
    }

    const usedDevModules = await context.usedDevModules();
    context.debug({ usedDevModules: [...usedDevModules] });

    if(target.devDependencies) {
    [
      ...context.optionalDevModules(
        new Set(Object.keys(target.devDependencies))
      )
    ]
      .filter(m => !usedDevModules.has(m))
      .forEach(m => {
        if (template.devDependencies === undefined) {
          template.devDependencies = {};
        }
        template.devDependencies[m] = "--delete--";
      });
    }
    
    const actions = {};

    target = merge(
      target,
      template,
      "",
      (action, hint) => aggregateActions(actions, action, hint),
      {
        "*": {
          compare: (a, b) => compareWithDefinedOrder(a, b, sortedKeys)
        },
        repository: { compare },
        files: { compare, type: "chore", scope: "files" },
        bin: { compare, removeEmpty: true },
        "bin.*": { type: "chore", scope: "bin" },
        "scripts.*": {
          compare,
          merge: mergeExpressions,
          type: "chore",
          scope: "scripts"
        },
        dependencies: REMOVE_HINT,
        "dependencies.*": { ...DEPENDENCY_HINT, type: "fix" },
        devDependencies: REMOVE_HINT,
        "devDependencies.*": DEPENDENCY_HINT,
        peerDependencies: REMOVE_HINT,
        "peerDependencies.*": DEPENDENCY_HINT,
        optionalDependencies: REMOVE_HINT,
        "optionalDependencies.*": DEPENDENCY_HINT,
        bundeledDependencies: REMOVE_HINT,
        "bundeledDependencies.*": DEPENDENCY_HINT,
        "engines.*": {
          merge: mergeVersionsLargest,
          compare,
          type: "fix",
          scope: "engines"
        },
        config: REMOVE_HINT,
        "config.*": {
          compare,
          overwrite: false
        },
        "pacman.*": {
          overwrite: false
        },
        "pacman.depends.*": {
          merge: mergeVersionsLargest,
          compare,
          type: "fix",
          scope: "pacman"
        },
        ava: { compare: undefined },
        ...this.options.mergeHints
      }
    );

    let messages = actions2messages(actions, "chore(package): ", this.name);

    if (
      target.contributors !== undefined &&
      target.author !== undefined &&
      target.author.name !== undefined
    ) {
      const m = target.author.name.match(/(^[^<]+)<([^>]+)>/);
      if (m !== undefined) {
        const name = String(m[1]).replace(/^\s+|\s+$/g, "");
        const email = m[2];

        if (
          target.contributors.find(c => c.name === name && c.email === email)
        ) {
          delete target.author;
        }
      }
    }

    target = deleter(target, template, messages, []);

    Object.entries(this.options.keywords).forEach(([r, rk]) =>
      addKeyword(target, new RegExp(r), rk, messages)
    );

    removeKeyword(
      target,
      ["null", null, undefined, "npm-package-template"],
      messages
    );

    this.options.actions.forEach(action => {
      if (action.op === "replace") {
        const templateValue = jspath(template, action.path);

        jspath(target, action.path, (targetValue, setter) => {
          if (templateValue !== targetValue) {
            setter(templateValue);

            messages.push(
              `chore(package): set ${action.path}='${templateValue}' as in template`
            );
          }
        });
      }
    });

    target = context.expand(target);

    propertyKeys.forEach(key => {
      if (target[key] === "{{" + key + "}}") {
        delete target[key];

        messages.push(
          `chore(package): remove unknown value for ${key} ({{${key}}})`
        );
      }
    });

    let newContent = JSON.stringify(target, undefined, 2);
    const lastChar = newContent[newContent.length - 1];

    // keep trailing newline
    if (originalLastChar === "\n" && lastChar === "}") {
      newContent += "\n";
    }

    const changed = original !== newContent;

    if (changed && messages.length === 0) {
      messages.push("chore(package): update package.json from template");
    }

    return {
      content: newContent,
      messages,
      changed
    };
  }
}

function deleter(object, reference, messages, path) {
  if (
    typeof object === "string" ||
    object instanceof String ||
    object === true ||
    object === false ||
    object === undefined ||
    object === null ||
    typeof object === "number" ||
    object instanceof Number
  ) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map((e, i) => {
      path.push(i);
      const n = deleter(
        object[i],
        Array.isArray(reference) ? reference[i] : undefined,
        messages,
        path
      );
      path.pop();
      return n;
    });
  }

  if (reference) {
    Object.entries(reference).forEach(([key, rk]) => {
      path.push(key);

      if (rk === "--delete--" && object[key] !== undefined) {
        if (object[key] !== "--delete--") {
          messages.push(`chore(package): delete ${path.join(".")}`);
        }
        delete object[key];
      } else {
        object[key] = deleter(object[key], rk, messages, path);
      }
      path.pop();
    });
  }

  return object;
}

function removeKeyword(pkg, keywords, messages) {
  if (pkg.keywords !== undefined) {
    keywords.forEach(keyword => {
      if (pkg.keywords.find(k => k === keyword)) {
        messages.push(`docs(package): remove keyword ${keyword}`);
        pkg.keywords = pkg.keywords.filter(k => k !== keyword);
      }
    });

    if (
      (pkg.keywords.length === 1 && pkg.keywords[0] === null) ||
      pkg.keywords[0] === undefined
    ) {
      messages.push(`docs(package): remove keyword null`);
      pkg.keywords = [];
    }
  }
}

function addKeyword(pkg, regex, keyword, messages) {
  if (keyword === undefined || keyword === null || keyword === "null") {
    return;
  }

  if (pkg.name.match(regex)) {
    if (pkg.keywords === undefined) {
      pkg.keywords = [];
    }
    if (!pkg.keywords.find(k => k === keyword)) {
      messages.push(`docs(package): add keyword ${keyword}`);
      pkg.keywords.push(keyword);
    }
  }
}
