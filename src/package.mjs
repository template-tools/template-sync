import {
  merge,
  mergeVersionsLargest,
  mergeExpressions
} from "hinted-tree-merger";
import { File } from "./file.mjs";
import {
  actions2messages,
  aggregateActions,
  jspath,
  defaultEncodingOptions,
  compare
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
  "native",
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

const REMOVE_HINT = { compare, removeEmpty: true };
const DEPENDENCY_HINT = { merge: mergeVersionsLargest };

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

  optionalDevDependencies(modules = new Set()) {
    return new Set(["cracks", "dont-crack"].filter(m => modules.has(m)));
  }

  async usedDevDependencies(content) {
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

    if (target.devDependencies) {
      const usedDevDependencies = await context.usedDevDependencies();
      context.debug(`used devDependencies: ${[...usedDevDependencies]}`);
      [
        ...context.optionalDevDependencies(
          new Set(Object.keys(target.devDependencies))
        )
      ]
        .filter(m => !usedDevDependencies.has(m))
        .forEach(m => {
          if (template.devDependencies === undefined) {
            template.devDependencies = {};
          }
          template.devDependencies[m] = "--delete--";
          context.debug(`delete devDependency: ${m}`);
        });
    }

    Object.entries(this.options.keywords).forEach(([r, keyword]) => {
      if (target.name.match(new RegExp(r))) {
        if (template.keywords === undefined) {
          template.keywords = [];
        }
        template.keywords.push(keyword);
      }
    });

    const actions = {};

    target = merge(
      target,
      template,
      "",
      (action, hint) => aggregateActions(actions, action, hint),
      {
        "": { orderBy: sortedKeys },
        "*": { scope: "package", type: "chore" },
        keywords: { removeEmpty: true, compare, type: "docs" },
        repository: { compare },
        files: { compare, scope: "files", removeEmpty: true },
        bin: { compare, removeEmpty: true },
        "bin.*": { scope: "bin" },
        "scripts.*": {
          compare,
          merge: mergeExpressions,
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
