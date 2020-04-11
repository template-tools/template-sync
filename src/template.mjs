import { replaceWithOneTimeExecutionMethod } from "one-time-execution-method";
import micromatch from "micromatch";
import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare
} from "hinted-tree-merger";
import { StringContentEntry } from "content-entry";
import { LogLevelMixin } from "loglevel-mixin";

import { asArray } from "./util.mjs";
import { ReplaceIfEmpty } from "./mergers/replace-if-empty.mjs";
import { mergers } from "./mergers.mjs";

const templateCache = new Map();

/**
 * @param {Conext} context
 * @param {string[]} sources
 * @param {Object} options
 *
 * @property {Conext} context
 * @property {string[]} sources
 * @property {Set<Branch>} branches all used branches direct and inherited
 * @property {Set<Branch>} initialBranches root branches used to define the template
 */
export class Template extends LogLevelMixin(class {}) {
  static clearCache() {
    templateCache.clear();
  }

  /**
   * Remove duplicate sources
   * sources staring wit '-' will be removed
   * @param {Context} context
   * @param {string[]} sources
   * @param {Object} options
   */
  static async templateFor(context, sources, options) {
    sources = [...new Set(asArray(sources))];

    const remove = sources.filter(s => s[0] === "-").map(s => s.slice(1));
    sources = sources
      .filter(s => remove.indexOf(s) < 0)
      .filter(s => s[0] !== "-")
      .sort();

    const key = sources.join(",");

    let template = templateCache.get(key);

    if (template === undefined) {
      template = new Template(context, sources, options);
      templateCache.set(key, template);
    }

    await template.initialize();

    return template;
  }

  constructor(context, sources, options = {}) {
    super();
    Object.defineProperties(this, {
      context: { value: context },
      provider: { value: context.provider },
      sources: { value: sources },
      branches: { value: new Set() },
      initialBranches: { value: new Set() },
      entryCache: { value: new Map() },
      options: { value: options }
    });

    this.logLevel = options.logLevel;
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

  log(...args) {
    this.context.log(...args);
  }

  async entry(name) {
    await this.initialize();

    const entry = this.entryCache.get(name);
    if (entry === undefined) {
      throw new Error(`No such entry ${name}`);
    }

    return entry;
  }

  async initialize() {
    this.trace(`Initialize template from ${this.sources}`);

    const pkg = new StringContentEntry(
      "package.json",
      JSON.stringify(await this._templateFrom(this.sources, true))
    );

    this.entryCache.set(pkg.name, pkg);

    for (const branch of this.branches) {
      for await (const entry of branch.entries()) {
        if (!entry.isBlob) {
          continue;
        }

        const name = entry.name;
        this.trace(`template entry ${branch.fullCondensedName}/${name}`);
        if (name === "package.json") {
          continue;
        }

        const ec = this.entryCache.get(entry.name);
        if (ec) {
          this.entryCache.set(
            name,
            await this.mergeEntry(this.context, entry, ec)
          );
        } else {
          this.entryCache.set(name, entry);
        }
      }
    }
  }

  async mergeEntry(ctx, a, b) {
    for (const merger of mergers) {
      const found = micromatch([a.name], merger.pattern);
      if (found.length) {
        const commit = await merger.merge(ctx, a, b, {
          ...merger.defaultOptions,
          mergeHints: Object.fromEntries(
            Object.entries(merger.defaultOptions.mergeHints).map(([k, v]) => [
              k,
              { ...v, keepHints: true }
            ])
          )
        });
        if (commit !== undefined) {
          return commit.entry;
        }
      }
    }

    return a;
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

      this.debug(`Load ${branch.fullCondensedName}`);

      this.branches.add(branch);
      if (isInitialSource) {
        this.initialBranches.add(branch);
      }

      try {
        const pc = await branch.entry("package.json");

        try {
          const pkg = JSON.parse(await pc.getString());

          result = mergeTemplate(result, pkg);

          const template = pkg.template;

          if (template && template.inheritFrom) {
            result = mergeTemplate(
              result,
              await this._templateFrom(asArray(template.inheritFrom))
            );
          }
        } catch (e) {
          this.error(branch.fullCondensedName, e);
        }
      } catch (e) {
        continue;
      }
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

  async properties() {
    const pkg = await this.package();
    return pkg.template ? pkg.template.properties : undefined;
  }

  /**
   *
   */
  async mergers() {
    await this.initialize();

    const pkg = await this.package();

    // order default pattern to the last
    const mappings = pkg.template.mergers.sort((a, b) => {
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
            factories.find(f => f.name === mapping.type) || ReplaceIfEmpty;

          return [
            name,
            factory,
            { ...factory.defaultOptions, ...mapping.options }
          ];
        });
      })
      .reduce((last, current) => Array.from([...last, ...current]), []);
  }

  async addUsedPackage(targetBranch) {
    await this.initialize();

    return Promise.all(
      [...this.initialBranches]
        .map(async sourceBranch => {
          const name = targetBranch.fullCondensedName;
          const usedByBranchName = "npm-template-sync-used-by";

          let prBranch = await sourceBranch.repository.branch(usedByBranchName);
          if (prBranch) {
            sourceBranch = prBranch;
          }

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

            if (prBranch === undefined) {
              prBranch = await sourceBranch.createBranch(usedByBranchName);
            }

            await prBranch.commit(`fix: add ${name}`, [
              new StringContentEntry(
                "package.json",
                JSON.stringify(pkg, undefined, 2)
              )
            ]);

            if (sourceBranch === prBranch) {
              return undefined;
            }

            return sourceBranch.createPullRequest(prBranch, {
              title: `add ${name}`,
              body: `add ${name} to usedBy`
            });
          }
        })
        .filter(x => x !== undefined)
    );
  }
}

replaceWithOneTimeExecutionMethod(Template.prototype, "initialize");

export function mergeTemplate(a, b) {
  const mvl = { keepHints: true, merge: mergeVersionsLargest };
  return merge(a, b, "", undefined, {
    "engines.*": mvl,
    "scripts.*": { keepHints: true, merge: mergeExpressions },
    "dependencies.*": mvl,
    "devDependencies.*": mvl,
    "peerDependencies.*": mvl,
    "optionalDependencies.*": mvl,
    "config.*": { keepHints: true, overwrite: false },
    "pacman.*": { keepHints: true, overwrite: false },
    "pacman.depends.*": mvl,
    "template.mergers": { key: ["type", "pattern"] },
    "template.inheritFrom": { merge: mergeSkip },
    "template.usedBy": { merge: mergeSkip },
    "template.properties.node_version": mvl,
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
