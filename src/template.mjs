import { merge, mergeVersionsLargest, mergeExpressions, compare }  from "hinted-tree-merger";
import { asArray } from './util.mjs';
import { Package } from './package.mjs';


/**
 * @param {RepositoryProvider} provider
 * @param {string|string[]} templates
 */
export class Template {
  constructor(provider, templates) {
    Object.defineProperties(this, {
      provider: { value: provider },
      templates: { value: asArray(templates) },
      entryCache: { value: new Map() }
    });
  }

  toString()
  {
    return this.templates[0];
  }

  async entry(name) {
    let ec = this.entryCache(name);
    if (ec) {
      return ec;
    }

    templates.map(template => provider.branch(template));
  }

  async *entries(matchingPatterns) {
    const branch = await this.provider.branch(this.templates[0]);
    yield *branch.entries(matchingPatterns);
  }

  async sources() {
    return Promise.all(this.templates.map(template => this.provider.branch(template)));
  }

  async package() {
    if(!this._package) {
      this._package = await templateFrom(this.provider, this.templates);
    }

    return this._package;
  }

  async addUsedPackage(context, targetBranch) {
    const pullRequests = [];
    const prBranches = [];
    let packageJson;

    for (const templateBranch of await this.sources()) {
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
export async function templateFrom(provider, sources) {
  let result = {};

  for(const source of sources) {
    const branch = await provider.branch(source);
    const pc = await branch.entry("package.json");
    const pkg = JSON.parse(await pc.getString());
    result = mergeTemplate(result, pkg);
  
    const template = pkg.template;
  
    if (template && template.inheritFrom) {
      result = mergeTemplate(result, await templateFrom(provider, asArray(template.inheritFrom)));
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
