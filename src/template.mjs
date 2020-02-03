import micromatch from "micromatch";
import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare
} from "hinted-tree-merger";
import { StringContentEntry } from "content-entry";
import { asArray } from "./util.mjs";
import { Package } from "./mergers/package.mjs";
import { ReplaceIfEmpty } from "./mergers/replace-if-empty.mjs";
import { mergers } from "./mergers.mjs";

const templateCache = new Map();

/**
 * @param {RepositoryProvider} provider
 * @param {string[]} sources
 *
 * @property {RepositoryProvider} provider
 * @property {string[]} sources
 * @property {Set<Branch>} branches
 * @property {Set<Branch>} initialBranches
 */
export class Template {

  static clearCache() {
    templateCache.clear();
  }
  
  static async templateFor(provider, urls) {
    urls = asArray(urls);
    const key = urls.join(",");
    let template = templateCache.get(key);

    if (template === undefined) {
      template = new Template(provider, urls);
      await template.initialize();
      templateCache.set(key, template);
    }

    return template;
  }

  constructor(provider, sources) {
    Object.defineProperties(this, {
      provider: { value: provider },
      sources: { value: sources },
      branches: { value: new Set() },
      initialBranches: { value: new Set() },
      entryCache: { value: new Map() }
    });
  }

  get name() {
    return (this.initialBranches.size > 0
      ? [...this.initialBranches].map(b => b.fullCondensedName)
      : this.sources
    ).join(",");
  }

  toString() {
    return this.name;
  }

  async entry(name) {
    await this.initialize();

    /*console.log("ENTRY", name, this.entryCache.get(name), [
      ...this.entryCache.keys()
    ]);*/

    const entry = this.entryCache.get(name);
    if (entry === undefined) {
      throw new Error(`No such entry ${name}`);
    }

    return entry;
  }

  async initialize() {
    if (this.entryCache.size > 0) {
      return;
    }

    this.entryCache.set(
      "package.json",
      new StringContentEntry(
        "package.json",
        JSON.stringify(await this._templateFrom(this.sources, true))
      )
    );

    for (const branch of this.branches) {
      if (branch) {
        for await (const entry of branch.entries()) {
          const ec = this.entryCache.get(entry.name);
          if (ec) {
          } else {
            this.entryCache.set(entry.name, entry);
          }
        }
      }
    }
  }

  /**
   * load all templates and collects the files
   * @param {string|Object} sources repo nmae or package content
   */
  async _templateFrom(sources, isInitialSource) {
    let result = {};

    for (const source of sources) {
      const branch = await this.provider.branch(source);

      if (branch === undefined || this.branches.has(branch)) {
        continue;
      }

      this.branches.add(branch);
      if (isInitialSource) {
        this.initialBranches.add(branch);
      }

      try {
        const pc = await branch.entry("package.json");
        const pkg = JSON.parse(await pc.getString());

        result = mergeTemplate(result, pkg);

        const template = pkg.template;

        if (template && template.inheritFrom) {
          result = mergeTemplate(
            result,
            await this._templateFrom(asArray(template.inheritFrom))
          );
        }
      } catch {}
    }

    return result;
  }

  async *entries(matchingPatterns) {
    await this.initialize();

    for (const [name, entry] of this.entryCache) {
      yield entry;
    }
  }

  async package() {
    const entry = await this.entry("package.json");
    return JSON.parse(await entry.getString());
  }

  /**
   *
   */
  async mergers() {
    await this.initialize();

    const pkg = await this.package();

    // order default pattern to the last
    const mappings = pkg.template.files.sort((a, b) => {
      if (a.pattern === "**/*") return 1;
      if (b.pattern === "**/*") return -1;
      return 0;
    });

    const factories = mergers;

    let alreadyPresent = new Set();
    const names = [...this.entryCache.values()]
      .filter(entry => entry.isBlob)
      .map(entry => entry.name);

    return mappings
      .map(mapping => {
        const found = micromatch(names, mapping.pattern);
        const notAlreadyProcessed = found.filter(f => !alreadyPresent.has(f));

        alreadyPresent = new Set([...Array.from(alreadyPresent), ...found]);

        return notAlreadyProcessed.map(name => {
          const factory =
            factories.find(merger => merger.name === mapping.merger) ||
            ReplaceIfEmpty;

          return new factory(name, mapping.options);
        });
      })
      .reduce((last, current) => Array.from([...last, ...current]), []);
  }

  async addUsedPackage(targetBranch) {
    await this.initialize();

    return Promise.all(
      [...this.initialBranches].map(async sourceBranch => {
        const name = targetBranch.fullCondensedName;
        const entry = await sourceBranch.entry("package.json");
        const pkg = JSON.parse(await entry.getString());

        if (pkg.template === undefined) {
          pkg.template = {};
        }
        if (!Array.isArray(pkg.template.usedBy)) {
          pkg.template.usedBy = [];
        }

        if (!pkg.template.usedBy.find(n => n === name)) {
          pkg.template.usedBy.push(name);
          pkg.template.usedBy = pkg.template.usedBy.sort();

          const prBranch = await sourceBranch.createBranch(
            `npm-template-sync-track/${name}`
          );
    
          await prBranch.commit(`fix: add ${name}`, [
            new StringContentEntry(
              "package.json",
              JSON.stringify(pkg, undefined, 2)
            )
          ]);

          return sourceBranch.createPullRequest(prBranch, {
            title: `add ${name}`,
            body: `add tracking info for ${name}`
          });
        }
      })
    );
  }
}

export function mergeTemplate(a, b) {
  return merge(a, b, "", undefined, {
    "engines.*": { keepHints: true, merge: mergeVersionsLargest },
    "scripts.*": { keepHints: true, merge: mergeExpressions },
    "dependencies.*": { merge: mergeVersionsLargest },
    "devDependencies.*": { merge: mergeVersionsLargest },
    "peerDependencies.*": { merge: mergeVersionsLargest },
    "optionalDependencies.*": { merge: mergeVersionsLargest },
    "config.*": { overwrite: false },
    "pacman.*": { overwrite: false },
    "pacman.depends.*": { merge: mergeVersionsLargest },
    "template.files": { key: ["merger", "pattern"] },
    "template.inheritFrom": { merge: mergeSkip },
    "template.usedBy": { merge: mergeSkip },
    "*.options.badges": {
      key: "name",
      compare,
      keepHints: true
    },
    "*": {
      keepHints: true
    }
  });
}
