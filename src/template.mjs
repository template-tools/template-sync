import { join, dirname } from "path";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { matcher } from "matching-iterator";
import {
  merge,
  mergeVersionsLargest,
  mergeExpressions,
  mergeSkip,
  compare,
  reanimateHints
} from "hinted-tree-merger";
import { StringContentEntry } from "content-entry";
import { LogLevelMixin } from "loglevel-mixin";

import { asArray, normalizeTemplateSources } from "./util.mjs";
import { ReplaceIfEmpty } from "./mergers/replace-if-empty.mjs";
import { mergers } from "./mergers.mjs";

const templateCache = new Map();

/**
 * @typedef {Object} EntryMerger
 * @property {string} name
 * @property {Class} factory
 * @property {Object} options
 */

/**
 * @typedef {Object} Merger
 * @property {string} type
 * @property {string} pattern
 * @property {Class} factory
 * @property {Object} options
 */

/**
 * @param {Conext} context
 * @param {string[]} sources
 * @param {Object} options
 *
 * @property {Conext} context
 * @property {string[]} sources
 * @property {Merger[]} mergers
 * @property {Set<Branch>} branches all used branches direct and inherited
 * @property {Set<Branch>} keyBranches branches used to define the template
 */
export class Template extends LogLevelMixin(class {}) {
  static clearCache() {
    templateCache.clear();
  }

  /**
   * load a template
   * @param {Context} context
   * @param {string[]} sources
   * @param {Object} options
   */
  static async templateFor(context, sources, options) {
    sources = normalizeTemplateSources(sources);
    const key = sources.join(",");

    let template = templateCache.get(key);

    //console.log("T", key, template ? template.name : "not cached");

    if (template === undefined) {
      template = await new Template(context, sources, options);
      templateCache.set(template.name, template);
      templateCache.set(template.key, template);
      //console.log("C", key, template.key);
    }

    return template;
  }

  constructor(context, sources, options = {}) {
    super();
    Object.defineProperties(this, {
      context: { value: context },
      sources: { value: sources },
      branches: { value: new Set() },
      keyBranches: { value: new Set() },
      entryCache: { value: new Map() },
      options: { value: options },
      mergers: { value: [] }
    });

    this.logLevel = options.logLevel;

    return this.initialize();
  }

  get provider() {
    return this.context.provider;
  }

  get name() {
    return this.sources.join(",");
  }

  get key() {
    return [...this.keyBranches]
      .map(b => b.fullCondensedName)
      .sort()
      .join(",");
  }

  toString() {
    return this.name;
  }

  log(...args) {
    this.context.log(...args);
  }

  entry(name) {
    const entry = this.entryCache.get(name);
    if (entry === undefined) {
      throw new Error(`No such entry ${name}`);
    }

    return entry;
  }

  async initialize() {
    this.trace(`Initialize template from ${this.name}`);

    const pj = await this._templateFrom(this.sources);

    if (pj instanceof Template) {
      this.debug(`Deliver from cache ${this.name} (${this.key})`);
      return pj;
    }

    if (pj.template && pj.template.mergers) {
      this.mergers.push(
        ...pj.template.mergers
          .map(m => {
            if (m.enabled === undefined) {
              m.enabled = true;
            }
            m.factory = mergers.find(f => f.name === m.type) || ReplaceIfEmpty;
            m.options = reanimateHints({
              ...m.factory.options,
              ...m.options
            });
            m.priority = m.options.priority
              ? m.options.priority
              : m.factory.priority;

            if (m.pattern === undefined) {
              m.pattern = m.factory.pattern;
            }
            return m;
          })
          .sort((a, b) => b.priority - a.priority)
      );
    }

    if (this.mergers.length === 0) {
      this.mergers.push(
        ...mergers
          .map(m => {
            return {
              factory: m,
              enabled: true,
              priority: m.priority,
              options: m.options
            };
          })
          .sort((a, b) => b.priority - a.priority)
      );
    }

    const pkg = new StringContentEntry("package.json", JSON.stringify(pj));

    pkg.merger = this.mergerFor(pkg.name);

    this.entryCache.set(pkg.name, pkg);

    for (let branch of this.branches) {
      if (branch.equals(this.context.targetBranch)) {
        continue;
      }

      branch = await branchFromCache(branch);

      for await (const entry of branch.entries()) {
        if (!entry.isBlob) {
          continue;
        }

        const name = entry.name;
        this.trace(`Load ${branch.fullCondensedName}/${name}`);
        if (name === "package.json") {
          continue;
        }

        const ec = this.entryCache.get(entry.name);
        if (ec) {
          this.entryCache.set(
            name,
            await this.mergeEntry(this.context, branch, entry, ec)
          );
        } else {
          entry.merger = this.mergerFor(entry.name);
          this.entryCache.set(name, entry);
        }
      }
    }

    return this;
  }

  /**
   * Find a suitable merger for each entry
   * @param {Iterator <ContentEntry>} entries
   * @return {Iterator <[ContentEntry,Merger]>}
   */
  async *entryMerger(entries) {
    for await (const entry of entries) {
      const merger = this.mergerFor(entry.name);
      if (merger) {
        yield [entry, merger];
      }
    }
  }

  /**
   * Find a suitable merger
   * @param {string} name of the entry
   * @return {Merger}
   */
  mergerFor(name) {
    for (const merger of this.mergers) {
      if ([...matcher([name], merger.pattern)].length) {
        return merger;
      }
    }
  }

  async mergeEntry(ctx, branch, a, b) {
    const merger = this.mergerFor(a.name);
    if (merger !== undefined && merger.enabled) {
      this.trace(
        `Merge ${merger.type} ${branch.fullCondensedName}/${a.name} + ${
          b ? b.name : "<missing>"
        } '${merger.pattern}'`
      );

      try {
        for await (const commit of await merger.factory.commits(ctx, a, b, {
          ...merger.options,
          mergeHints: Object.fromEntries(
            Object.entries(merger.options.mergeHints).map(([k, v]) => [
              k,
              { ...v, keepHints: true }
            ])
          )
        })) {
          for (const entry of commit.entries) {
            if (entry.name === a.name) {
              entry.merger = merger;
              return entry;
            }
          }
        }
      } catch (e) {
        this.error(
          `${this.name} ${branch.fullCondensedName}/${a.name}(${merger.type}): ${e}`
        );
        throw e;
      }
    }

    a.merger = merger;
    return a;
  }

  /**
   * Load all templates and collects the entries.
   * @param {string} sources branch names
   * @param {Branch[]} inheritencePath who was requesting us
   * @return {Object} package as merged from sources
   */
  async _templateFrom(sources, inheritencePath = []) {
    let result = {};

    for (const source of sources) {
      const branch = await this.provider.branch(source);

      if (branch === undefined) {
        this.trace(`No such branch ${source}`);
        continue;
      }

      if (this.branches.has(branch)) {
        this.trace(`Already loaded ${branch.fullCondensedName}`);
        continue;
      }

      this.debug(
        `Load ${branch.fullCondensedName} (${
          inheritencePath.length ? inheritencePath : "root"
        })`
      );

      this.branches.add(branch);

      try {
        const pc = await branch.entry("package.json");

        try {
          const pkg = JSON.parse(await pc.getString());

          if (inheritencePath.length <= 1) {
            if (branch === this.context.targetBranch) {
              if (pkg.template) {
                if (pkg.template.usedBy) {
                  this.allKeysCollected = true;
                }
                if (
                  Object.keys(pkg.template).filter(k => k !== "inheritFrom")
                    .length > 0
                ) {
                  this.keyBranches.add(branch);
                }
              }
            } else if (!this.allKeysCollected) {
              this.keyBranches.add(branch);
            }
          } else {
            const inCache = templateCache.get(this.key);
            if (inCache) {
              this.debug(`Found in cache ${this.name} (${this.key})`);
              //return inCache;
            }
          }

          result = mergeTemplate(result, pkg);

          const template = pkg.template;

          if (template && template.inheritFrom) {
            const inherited = await this._templateFrom(
              asArray(template.inheritFrom),
              [...inheritencePath, branch]
            );

            result = mergeTemplate(
              result,
              inherited instanceof Template
                ? await inherited.package()
                : inherited
            );
          }
        } catch (e) {
          this.error(e);
        }
      } catch (e) {
        continue;
      }
    }

    return result;
  }

  *entries(patterns) {
    yield* matcher(this.entryCache.values(), patterns, {
      name: "name",
      caseSensitive: true
    });
  }

  async dump(dest) {
    for (const entry of this.entryCache.values()) {
      if (entry.isBlob) {
        const d = join(dest, entry.name);
        await mkdir(dirname(d), { recursive: true });
        const s = await entry.getReadStream();
        s.pipe(createWriteStream(d));
      }
    }
  }

  async package() {
    const entry = this.entry("package.json");
    return JSON.parse(await entry.getString());
  }

  async properties() {
    const pkg = await this.package();

    return Object.assign(
      {
        template: {
          key: this.key,
          name: this.name
        }
      },
      pkg.template && pkg.template.properties
    );
  }

  /**
   * Updates usedBy section of the template branch.
   * @param {Branch} targetBranch template to be updated
   * @param {string[]} templateSources original branch identifiers (even with deletion hints)
   * @param {Object} options as passed to commitIntoPullRequest
   * @return {AsyncIterator <PullRequest>}
   */
  async *updateUsedBy(targetBranch, templateSources, options) {
    async function* modifyWithPR(sourceBranch, modify, action, itemName) {
      const name = "package.json";
      const entry = await sourceBranch.entry(name);
      const org = await entry.getString();
      const modified = JSON.stringify(modify(JSON.parse(org)), undefined, 2);

      if (org !== modified) {
        const message = `fix: ${action} ${itemName}`;

        yield sourceBranch.commitIntoPullRequest(
          { message, entries: [new StringContentEntry(name, modified)] },
          {
            pullRequestBranch: "npm-template-sync/used-by",
            title: message,
            body: message,
            ...options
          }
        );
      }
    }

    for (const branchName of templateSources
      .filter(t => t.startsWith("-"))
      .map(t => t.slice(1))) {
      yield* modifyWithPR(
        await this.provider.branch(branchName),
        pkg => {
          if (pkg.template !== undefined && pkg.template.usedBy !== undefined) {
            pkg.template.usedBy = pkg.template.usedBy.filter(
              n => n !== targetBranch.fullCondensedName
            );
          }
          return pkg;
        },
        "remove",
        targetBranch.fullCondensedName
      );
    }

    const name = targetBranch.fullCondensedName;

    for (const sourceBranch of this.keyBranches) {
      if (targetBranch !== sourceBranch) {
        yield* modifyWithPR(
          sourceBranch,
          pkg => {
            if (pkg.template === undefined) {
              pkg.template = {};
            }
            if (!Array.isArray(pkg.template.usedBy)) {
              pkg.template.usedBy = [];
            }

            if (!pkg.template.usedBy.find(n => n === name)) {
              pkg.template.usedBy.push(name);
              pkg.template.usedBy = pkg.template.usedBy.sort();
            }

            return pkg;
          },
          "add",
          name
        );
      }
    }
  }
}

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
    "template.properties.*": { overwrite: false },
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

const branchCache = new Map();

async function branchFromCache(branch) {
  let b = branchCache.get(branch.fullCondensedName);
  if (b) {
    return b;
  }

  const entryCache = new Map();

  for await (const entry of branch.entries()) {
    entryCache.set(entry.name, entry);
  }

  b = {
    name: branch.name,
    equals(other) {
      return branch.equals(other);
    },
    async *entries() {
      for (const entry of entryCache.values()) {
        yield entry;
      }
    },
    async entry(name) {
      return entryCache.get(name);
    }
  };

  branchCache.set(branch.fullCondensedName, b);

  return b;
}
