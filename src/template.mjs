import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare
} from "hinted-tree-merger";
import { StringContentEntry } from "content-entry";
import micromatch from "micromatch";
import { asArray } from "./util.mjs";
import { Package } from "./mergers/package.mjs";
import { ReplaceIfEmpty } from "./mergers/replace-if-empty.mjs";
import { mergers } from "./mergers.mjs";

const templateCache = new Map();

/**
 * @param {RepositoryProvider} provider
 * @param {string[]} sources
 */
export class Template {
  static templateFor(provider, urls) {
    urls = asArray(urls);
    const key = urls.join(",");
    let template = templateCache.get(key);

    if (template === undefined) {
      template = new Template(provider, urls);
      templateCache.set(key, template);
    }

    return template;
  }

  constructor(provider, sources) {
    Object.defineProperties(this, {
      provider: { value: provider },
      sources: { value: sources },
      entryCache: { value: new Map() }
    });
  }

  toString() {
    return this.sources.join(",");
  }

  async entry(name) {
    let ec = this.entryCache.get(name);
    if (ec) {
      return ec;
    }

    if (name === "package.json") {
      ec = new StringContentEntry(
        name,
        JSON.stringify(
          await _templateFrom(this.provider, this.sources, new Set()),
          undefined,
          2
        )
      );

      this.entryCache.set(name, ec);
      return ec;
    }

    const branch = await this.provider.branch(this.sources[0]);
    return branch.entry(name);
  }

  async *entries(matchingPatterns) {
    for (const branch of await this.branches()) {
      console.log(branch);
      if (branch) {
        for await ( const entry of branch.entries(matchingPatterns)) {
          let ec = this.entryCache.get(entry.name);
          if(!ec) {
        //    this.entryCache.set(entry.name, entry);
          }

          yield entry;
        }
      }
    }
  }

  async branches() {
    return Promise.all(
      this.sources.map(source => this.provider.branch(source))
    );
  }

  async package() {
    const entry = await this.entry("package.json");
    return JSON.parse(await entry.getString());
  }

  /**
   *
   */
  async mergers() {
    const factories = mergers;

    const files = [];
    for await (const entry of this.entries()) {
      files.push(entry);
    }

    const pkg = await this.package();

    // order default pattern to the last
    const mappings = pkg.template.files.sort((a, b) => {
      if (a.pattern === "**/*") return 1;
      if (b.pattern === "**/*") return -1;
      return 0;
    });

    console.log(mappings);

    let alreadyPresent = new Set();

    return mappings
      .map(mapping => {
        const found = micromatch(
          files.map(f => f.name),
          mapping.pattern
        );

        const notAlreadyProcessed = found.filter(f => !alreadyPresent.has(f));

        alreadyPresent = new Set([...Array.from(alreadyPresent), ...found]);

        return notAlreadyProcessed.map(name => {
          const factory =
            factories.find(merger => merger.name === mapping.merger) ||
            ReplaceIfEmpty;

          console.log(name, factory);
          const merger = new factory(name, mapping.options);

          if (name === "package.json") {
            merger.template = new StringContentEntry(
              name,
              JSON.stringify(pkg, undefined, 2)
            );
          }

          return merger;
        });
      })
      .reduce((last, current) => Array.from([...last, ...current]), []);
  }

  async addUsedPackage(context, targetBranch) {
    const pullRequests = [];
    const prBranches = [];
    let packageJson;

    for (const templateBranch of await this.branches()) {
      let newTemplatePullRequest = false;
      const templateAddBranchName = "npm-template-trac-usage/1";
      let templatePRBranch = await templateBranch.repository.branch(
        templateAddBranchName
      );
      prBranches.push(templatePRBranch);

      const pkg = new Package("package.json");

      const templatePackage = await (templatePRBranch
        ? templatePRBranch
        : templateBranch
      ).entry(pkg.name);

      const templatePackageContent = await templatePackage.getString();

      packageJson =
        templatePackageContent === undefined || templatePackageContent === ""
          ? {}
          : JSON.parse(templatePackageContent);

      if (context.trackUsedByModule) {
        const name = targetBranch.fullCondensedName;

        if (packageJson.template === undefined) {
          packageJson.template = {};
        }
        if (!Array.isArray(packageJson.template.usedBy)) {
          packageJson.template.usedBy = [];
        }

        if (!packageJson.template.usedBy.find(n => n === name)) {
          packageJson.template.usedBy.push(name);
          packageJson.template.usedBy = packageJson.template.usedBy.sort();

          if (templatePRBranch === undefined) {
            templatePRBranch = await templateBranch.createBranch(
              templateAddBranchName
            );
            newTemplatePullRequest = true;
          }

          await templatePRBranch.commit(`fix: add ${name}`, [
            new StringContentEntry(
              "package.json",
              JSON.stringify(packageJson, undefined, 2)
            )
          ]);

          if (newTemplatePullRequest) {
            pullRequests.push(
              await templateBranch.createPullRequest(templatePRBranch, {
                title: `add ${name}`,
                body: `add tracking info for ${name}`
              })
            );
          }
        }
      }
    }

    return { packageJson, prBranches, pullRequests };
  }
}

/**
 * load all templates and collects the files
 * @param {RepositoryProvider} provider
 * @param {string|Object} sources repo nmae or package content
 */
async function _templateFrom(provider, sources, consulted) {
  let result = {};

  for (const source of sources) {
    const branch = await provider.branch(source);

    if (branch === undefined || consulted.has(branch)) {
      continue;
    }

    consulted.add(branch);

    const pc = await branch.entry("package.json");
    const pkg = JSON.parse(await pc.getString());
    result = mergeTemplate(result, pkg);

    const template = pkg.template;
    
    if (template && template.inheritFrom) {
      result = mergeTemplate(
        result,
        await _templateFrom(provider, asArray(template.inheritFrom), consulted)
      );
    }
  }

  return result;
}

export function mergeTemplate(a, b) {
  return merge(a, b, "", undefined, {
    "engines.*": { merge: mergeVersionsLargest },
    "scripts.*": { merge: mergeExpressions },
    "dependencies.*": { merge: mergeVersionsLargest },
    "devDependencies.*": { merge: mergeVersionsLargest },
    "pacman.depends.*": { merge: mergeVersionsLargest },
    "config.*": { overwrite: false },
    "pacman.*": { overwrite: false },
    "template.files": { key: ["merger", "pattern"] },
    "template.inheritFrom": { merge: mergeSkip },
    "template.usedBy": { merge: mergeSkip },
    "*.options.badges": {
      key: "name",
      compare
    }
  });
}

/**
 * find merger options in the template section of a package.json
 * @param {Object} json
 * @param {string} name
 * @return {Object}
 */
export function templateOptions(json, name) {
  if (json.template !== undefined && json.template.files !== undefined) {
    const m = json.template.files.find(f => f.merger === name);
    if (m !== undefined && m.options !== undefined) {
      return m.options;
    }
  }
  return {};
}
