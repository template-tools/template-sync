import { File } from "./file.mjs";
import {
  compareVersion,
  sortObjectsKeys,
  jspath,
  defaultEncodingOptions
} from "./util.mjs";
import {
  decodeScripts,
  encodeScripts,
  mergeScripts
} from "./package-scripts.mjs";
import diff from "simple-diff";

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
  "type",
  "private",
  "publishConfig",
  "main",
  "browser",
  "module",
  "svelte",
  "unpkg",
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
    return properties;
  }

  async mergeContent(context, original, templateContent) {
    const originalLastChar = original[original.length - 1];
    const originalTemplate = JSON.parse(templateContent);

    const targetRepository = context.targetBranch.repository;

    let target =
      original === undefined || original === "" ? {} : JSON.parse(original);

    const template = Object.assign({}, originalTemplate, {
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
    template.template = Object.assign({}, target.template, template.template);

    let messages = [];
    const properties = context.properties;

    if (target.name === undefined || target.name === "") {
      const m = targetRepository.name.match(/^([^\/]+)\/(.*)/);
      target.name = m ? m[2] : context.targetBranch.repository.name;
    }

    if (target.module !== undefined && !target.module.match(/\{\{module\}\}/)) {
      properties.module = target.module;
    }

    const slots = {
      repository: "chore(package): correct repository url",
      bugs: "chore(package): set bugs url from template",
      homepage: "chore(package): homepage from template",
      template: "chore(package): set template repo"
    };
    Object.keys(slots).forEach(key => {
      const templateValue = template[key];
      const d = diff(target[key], templateValue);

      if (
        templateValue !== undefined &&
        d.length > 0 &&
        !(
          d[0].type === "add" &&
          d[0].oldValue === undefined &&
          d[0].newValue === undefined
        )
      ) {
        messages.push(slots[key]);
        target[key] = templateValue;
      }
    });

    const decodedScripts = decodeScripts(target.scripts);

    const usedDevModules = await context.usedDevModules();

    context.debug({ usedDevModules: Array.from(usedDevModules) });

    const optionalDevModules = context.optionalDevModules(usedDevModules);

    context.debug({ optionalDevModules: Array.from(optionalDevModules) });

    const deepProperties = {
      devDependencies: { type: "chore", scope: "package", merge: defaultMerge },
      dependencies: { type: "fix", scope: "package", merge: defaultMerge },
      peerDependencies: { type: "fix", scope: "package", merge: defaultMerge },
      optionalDependencies: {
        type: "fix",
        scope: "package",
        merge: defaultMerge
      },
      bundeledDependencies: {
        type: "fix",
        scope: "package",
        merge: defaultMerge
      },
      scripts: { type: "chore", scope: "scripts", merge: defaultMerge },
      engines: { type: "chore", scope: "engines", merge: defaultMerge }
    };

    Object.keys(deepProperties).forEach(
      name => (deepProperties[name].name = name)
    );

    Object.keys(deepProperties).forEach(category => {
      if (template[category] !== undefined) {
        Object.keys(template[category]).forEach(d => {
          if (target[category] === undefined) {
            target[category] = {};
          }

          const tp = context.expand(template[category][d]);
          if (
            category === "devDependencies" &&
            target.dependencies !== undefined &&
            target.dependencies[d] === tp
          ) {
            // do not include dev dependency if regular dependency is already present
          } else {
            deepProperties[category].merge(
              target[category],
              target[category][d],
              tp,
              deepProperties[category],
              d,
              messages
            );
          }
        });
      }
    });

    Object.keys(template).forEach(p => {
      if (target[p] === undefined && target[p] !== "--delete--") {
        target[p] = template[p];
        messages.push(`chore(package): add ${p} from template`);
      }
    });

    target.scripts = encodeScripts(
      mergeScripts(decodedScripts, decodeScripts(template.scripts))
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

    const toBeDeletedModules =
      target.devDependencies === undefined
        ? []
        : Array.from(
            context.optionalDevModules(
              new Set(Object.keys(target.devDependencies))
            )
          ).filter(m => !usedDevModules.has(m));

    toBeDeletedModules.forEach(d => {
      messages = messages.filter(
        m => !m.startsWith(`chore(package): add ${d}@`)
      );
      delete target.devDependencies[d];
    });

    target = deleter(target, template, messages, []);

    Object.keys(this.options.keywords).forEach(r =>
      addKeyword(target, new RegExp(r), this.options.keywords[r], messages)
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
              `chore(package): set ${
                action.path
              }='${templateValue}' as in template`
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

    const sortedTarget = normalizePackage(target);

    let newContent = JSON.stringify(sortedTarget, undefined, 2);
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
    Object.keys(reference).forEach(key => {
      path.push(key);

      if (reference[key] === "--delete--" && object[key] !== undefined) {
        if (object[key] !== "--delete--") {
          messages.push(`chore(package): delete ${path.join(".")}`);
        }
        delete object[key];
      } else {
        object[key] = deleter(object[key], reference[key], messages, path);
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

function getVersion(e) {
  const m = e.match(/([\d\.]+)/);
  return m ? Number(m[1]) : undefined;
}

function normalizeVersion(e) {
  return e.replace(/^[\^\$]/, "");
}

/**
 *
 */
function defaultMerge(destination, target, template, dp, name, messages) {
  if (template === "--delete--") {
    if (target !== undefined) {
      messages.push(`${dp.type}(${dp.scope}): remove ${name}@${target}`);
      delete destination[name];
    }

    return;
  }

  if (target === undefined) {
    messages.push(`${dp.type}(${dp.scope}): add ${name}@${template}`);
    destination[name] = template;
  } else if (template !== target) {
    if (dp.name === "engines") {
      if (getVersion(target) > getVersion(template)) {
        return;
      }
    }
    if (dp.name === "devDependencies") {
      //console.log(`${target} <> ${template} -> ${compareVersion(normalizeVersion(target), normalizeVersion(template))}`);
      if (
        compareVersion(normalizeVersion(target), normalizeVersion(template)) >=
        0
      ) {
        return;
      }
    }

    messages.push(`${dp.type}(${dp.scope}): ${name}@${template}`);

    destination[name] = template;
  }
}

/**
 * bring package into nomalized (sorted) form
 * @param {Object} source
 * @return {Object} normalized source
 */
function normalizePackage(source) {
  const normalized = {};

  sortedKeys.forEach(key => {
    if (source[key] !== undefined) {
      switch (key) {
        case "bin":
        case "scripts":
        case "dependencies":
        case "devDependencies":
        case "peerDependencies":
        case "optionalDependencies":
        case "bundledDependencies":
          normalized[key] = sortObjectsKeys(source[key]);
          break;
        default:
          normalized[key] = source[key];
      }
    }
  });

  Object.keys(source).forEach(key => {
    if (normalized[key] === undefined) {
      normalized[key] = source[key];
    }
  });

  return normalized;
}
