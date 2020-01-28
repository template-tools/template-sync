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
 * @param {Set<Branch>} branches
 * @param {Set<Branch>} initialBranches
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
      branches: { value: new Set() },
      initialBranches: { value: new Set() },
      entryCache: { value: new Map() }
    });
  }

  toString() {
    return (this.initialBranches.size > 0
      ? [...this.initialBranches].map(b => b.fullCondensedName)
      : this.sources
    ).join(",");
  }

  async entry(name) {
    await this.initialize();
    return this.entryCache.get(name);
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
    const names = [...this.entryCache.keys()];

    return mappings
      .map(mapping => {
        const found = micromatch(names, mapping.pattern);
        const notAlreadyProcessed = found.filter(f => !alreadyPresent.has(f));

        alreadyPresent = new Set([...Array.from(alreadyPresent), ...found]);

        return notAlreadyProcessed.map(name => {
          const factory =
            factories.find(merger => merger.name === mapping.merger) ||
            ReplaceIfEmpty;

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

  async addUsedPackage(targetBranch, trackUsedByModule) {
    await this.initialize();

    const pullRequests = [];
    const prBranches = [];
    let packageJson;

    for (const templateBranch of this.branches) {
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

      if (trackUsedByModule) {
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
