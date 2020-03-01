import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare
} from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import {
  actions2messages,
  aggregateActions,
  jspath,
  asScalar,
  asArray,
  defaultEncodingOptions
} from "../util.mjs";

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
export class Package extends Merger {
  static get pattern() {
    return "package.json";
  }

  static get defaultOptions() {
    return {
      actions: [],
      keywords: []
    };
  }

  /**
   * Deliver some key properties
   * @param {ContentEntry} entry
   * @return {Object}
   */
  static async properties(entry) {
    const pkg = JSON.parse(await entry.getString(defaultEncodingOptions));

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
        properties.templateSources = asArray(pkg.template.repository.url);
      }
      if (pkg.template.inheritFrom !== undefined) {
        properties.templateSources = asArray(pkg.template.inheritFrom);
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

  static optionalDevDependencies(modules = new Set()) {
    return new Set(["cracks", "dont-crack"].filter(m => modules.has(m)));
  }

  static async usedDevDependencies(content) {
    content = await content;

    const pkg = content.length === 0 ? {} : JSON.parse(content);

    return moduleNames(pkg.release);
  }

  async mergeContent(context, original, templateContent) {
    const originalLastChar = original[original.length - 1];
    const targetRepository = context.targetBranch.repository;

    let target =
      original === undefined || original === "" ? {} : JSON.parse(original);

    const unknownKeys = new Set();
    propertyKeys.forEach(key => {
      if (target[key] === "{{" + key + "}}") {
        unknownKeys.add(key);
      }
    });

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
        inheritFrom: asScalar(
          [...context.template.initialBranches].map(
            branch => branch.fullCondensedName
          )
        )
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

    await deleteUnusedDevDependencies(context, target, template);

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
        bin: REMOVE_HINT,
        "bin.*": { removeEmpty: true, scope: "bin" },
        scripts: {
          orderBy: [
            "install",
            "pack",
            "prepare",
            "publish",
            "restart",
            "shrinkwrap",
            "start",
            "stop",
            "pretest",
            "test",
            "posttest",
            "cover",
            "uninstall",
            "version",
            "docs",
            "lint",
            "package"
          ]
        },
        "scripts.*": {
          merge: mergeExpressions,
          removeEmpty: true,
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
          compare,
          merge: mergeVersionsLargest,
          removeEmpty: true,
          type: "fix",
          scope: "engines"
        },
        release: REMOVE_HINT,
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
        "template.usedBy": { merge: mergeSkip },
        "template.repository": { remove: true },
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

        if (unknownKeys.has(key)) {
          messages.push(
            `chore(package): remove unknown value for ${key} ({{${key}}})`
          );
        }
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

export async function deleteUnusedDevDependencies(context, target, template) {
  if (target.devDependencies) {
    try {
      const usedDevDependencies = await context.usedDevDependencies();
      const allKnown = new Set([
        ...Object.keys(target.devDependencies),
        ...Object.keys(template.devDependencies)
      ]);

      context.debug(`used devDependencies: ${[...usedDevDependencies]}`);

      [...context.optionalDevDependencies(allKnown)]
        .filter(m => !usedDevDependencies.has(m))
        .forEach(m => {
          if (template.devDependencies === undefined) {
            template.devDependencies = {};
          }
          template.devDependencies[m] = "--delete--";
          context.debug(`devDependency: ${m}`);
        });
    } catch (e) {
      console.log(e);
    }
  }
}
