import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare
} from "hinted-tree-merger";
import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

import {
  actions2message,
  aggregateActions,
  jspath,
  asScalar,
  asArray,
  defaultEncodingOptions,
  normalizeTemplateSources
} from "../util.mjs";

function moduleNames(object, modules) {
  if (object !== undefined) {
    Object.entries(object).forEach(([k, v]) => {
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
  }
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
  "exports",
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

const propertyKeys = ["description", "version", "name", "main", "browser"];

const MODULE_HINT = { type: "fix", scope: "module" };
const REMOVE_HINT = { compare, removeEmpty: true };
const DEPENDENCY_HINT = { merge: mergeVersionsLargest, scope: "deps" };
const MERGE_HINTS = {
  "*": { scope: "package", type: "chore" },
  "": { orderBy: sortedKeys },
  type: MODULE_HINT,
  keywords: { removeEmpty: true, compare, type: "docs" },
  repository: { compare },
  files: { compare, scope: "files", removeEmpty: true },
  exports: { ...REMOVE_HINT, ...MODULE_HINT },
  imports: { ...REMOVE_HINT, ...MODULE_HINT },
  bin: REMOVE_HINT,
  "bin.*": { removeEmpty: true, scope: "bin" },
  scripts: {
    orderBy: [
      "preinstall",
      /^install/,
      "postinstall",
      "prepack",
      /^pack/,
      "postpack",
      /^prepare/,
      "prepublishOnly",
      "prepublish",
      /^publish/,
      "postpublish",
      "prerestart",
      /^restart/,
      "postrestart",
      "preshrinkwrap",
      /^shrinkwrap/,
      "postshrinkwrap",
      "prestart",
      /^start/,
      "poststart",
      "prestop",
      /^stop/,
      "poststop",
      "pretest",
      /^test/,
      "posttest",
      /^cover/,
      "preuninstall",
      /^uninstall/,
      "postuninstall",
      "preversion",
      /^version/,
      "postversion",
      /^docs/,
      /^lint/,
      /^package/
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
  "optionalDependencies.*": { ...DEPENDENCY_HINT, type: "fix" },
  bundeledDependencies: REMOVE_HINT,
  "bundeledDependencies.*": DEPENDENCY_HINT,
  "engines.*": {
    compare,
    merge: mergeVersionsLargest,
    removeEmpty: true,
    type: "fix",
    scope: "engines"
  },
  exports: REMOVE_HINT,
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
  template: { merge: mergeSkip }
};

/**
 * Merger for package.json
 */
export class Package extends Merger {
  static get pattern() {
    return "package.json";
  }

  static get options() {
    return {
      ...super.options,
      actions: [],
      keywords: [],
      optionalDevDependencies: ["cracks", "dont-crack"]
    };
  }

  /**
   * Deliver some key properties.
   * - name
   * - version
   * - description
   * - main
   * @param {ContentEntry} entry
   * @return {Object}
   */
  static async properties(entry) {
    const pkg = JSON.parse(await entry.getString(defaultEncodingOptions));

    const properties = {};

    if (pkg.name) {
      Object.assign(properties, {
        npm: { name: pkg.name, fullName: pkg.name }
      });
    }

    if (pkg.template !== undefined) {
      if (pkg.template.usedBy !== undefined) {
        properties.usedBy = pkg.template.usedBy;
      }
    }

    propertyKeys.forEach(key => {
      const value = pkg[key];
      if (value !== undefined && value !== `{{${key}}}`) {
        switch (key) {
          case "version":
            if (value === "0.0.0-semantic-release") {
              return;
            }
            break;

          case "name":
            properties.fullName = value;

            const m = value.match(/^(\@[^\/]+)\/(.*)/);
            if (m) {
              properties.npm.organization = m[1];
              properties.npm.name = m[2];
              properties.name = m[2];
              return;
            }
            break;
        }
        properties[key] = value;
      }
    });

    if (
      properties.main === undefined &&
      pkg.exports &&
      pkg.exports["."]
    ) {
      properties.main = pkg.exports["."];
    }

    Object.assign(properties, pkg.config);

    return properties;
  }

  static async usedDevDependencies(into, entry) {
    if (await entry.isEmpty()) {
      return into;
    }
    moduleNames(JSON.parse(await entry.getString()).release, into);
    return into;
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const templateContent = await sourceEntry.getString();
    const original = await destinationEntry.getString();
    const originalLastChar = original[original.length - 1];
    const targetRepository = context.targetBranch.repository;

    let target = original === "" ? {} : JSON.parse(original);

    const unknownKeys = new Set();
    propertyKeys.forEach(key => {
      if (target[key] === "{{" + key + "}}") {
        unknownKeys.add(key);
      }
    });

    target = context.expand(target);

    const template = context.expand({
      ...(templateContent.length ? JSON.parse(templateContent) : {}),
      repository: {
        type: targetRepository.type,
        url: targetRepository.url
      },
      bugs: {
        url: context.targetBranch.issuesURL
      },
      homepage: context.targetBranch.homePageURL
    });

    const properties = context.properties;

    if (target.name === undefined || target.name === "") {
      const m = targetRepository.name.match(/^([^\/]+)\/(.*)/);
      target.name = m ? m[2] : context.targetBranch.repository.name;
    }

    if (target.main !== undefined && !target.main.match(/\{\{main\}\}/)) {
      properties.main = target.main;
    }

    await deleteUnusedDevDependencies(context, target, template);

    Object.entries(options.keywords).forEach(([r, keyword]) => {
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
      { ...MERGE_HINTS, ...options.mergeHints }
    );

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

    options.actions.forEach(action => {
      if (action.op === "replace") {
        const templateValue = jspath(template, action.path);

        jspath(target, action.path, (targetValue, setter) => {
          if (templateValue !== targetValue) {
            setter(templateValue);

            aggregateActions(actions, {
              scope: "package",
              type: "chore",
              add: templateValue,
              path: action.path
            });
          }
        });
      }
    });

    target = context.expand(target);

    propertyKeys.forEach(key => {
      if (target[key] === "{{" + key + "}}") {
        delete target[key];

        if (unknownKeys.has(key)) {
          aggregateActions(actions, {
            scope: "package",
            type: "chore",
            remove: "{{" + key + "}}",
            path: key
          });
        }
      }
    });

    if (context.track) {
      if (target.template === undefined) {
        target.template = { inheritFrom: [] };
      }

      target.template.inheritFrom = asScalar(
        normalizeTemplateSources(
          [...asArray(target.template.inheritFrom), ...context.templateSources],
          [context.targetBranch.fullCondensedName]
        )
      );
    }

    let merged = JSON.stringify(target, undefined, 2);
    const lastChar = merged[merged.length - 1];

    // keep trailing newline
    if (originalLastChar === "\n" && lastChar === "}") {
      merged += "\n";
    }

    if (merged !== original) {
      yield {
        entries: [new StringContentEntry(name, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}

export async function deleteUnusedDevDependencies(context, target, template) {
  if (target.devDependencies) {
    try {
      const usedDevDependencies = new Set();
      for await (const [entry, merger] of context.template.entryMerger(
        context.targetBranch.entries()
      )) {
        await merger.factory.usedDevDependencies(
          usedDevDependencies,
          entry,
          merger.options
        );
      }

      const allKnown = new Set(
        Object.keys(target.devDependencies).concat(
          Object.keys(template.devDependencies)
        )
      );

      const optionalDevDependencies = new Set();
      for await (const [entry, merger] of context.template.entryMerger(
        context.targetBranch.entries()
      )) {
        await merger.factory.optionalDevDependencies(
          optionalDevDependencies,
          allKnown,
          merger.options
        );
      }

      template.devDependencies = {
        ...template.devDependencies,
        ...Object.fromEntries(
          [...optionalDevDependencies]
            .filter(d => !usedDevDependencies.has(d))
            .map(d => [d, "--delete--"])
        )
      };

      context.debug(`used devDependencies: ${[...usedDevDependencies]}`);
    } catch (e) {
      console.error(e);
    }
  }
}
