import { createContext } from 'expression-expander';
import { value } from 'jsonpath';

import { Package } from './package';
const mm = require('micromatch');

/**
 * context prepared to execute one package
 */
export class PreparedContext {
  static async from(context, targetBranchName) {
    const pc = new PreparedContext(context, targetBranchName);
    await pc.initialize();
    return pc;
  }

  constructor(context, targetBranchName) {
    Object.defineProperties(this, {
      ctx: {
        value: createContext({
          properties: Object.assign({}, context.properties),
          keepUndefinedValues: true,
          leftMarker: '{{',
          rightMarker: '}}',
          markerRegexp: '{{([^}]+)}}',
          evaluate: (expression, context, path) => value(properties, expression)
        })
      },
      files: {
        value: new Map()
      },
      context: { value: context },
      targetBranchName: { value: targetBranchName }
    });
  }

  get logger() {
    return this.context.logger;
  }

  get provider() {
    return this.context.provider;
  }

  get templateBranchName() {
    return this.context.templateBranchName;
  }

  expand(...args) {
    return this.ctx.expand(...args);
  }

  fail(...args) {
    return this.context.fail(...args);
  }

  async initialize() {
    const context = this.context;

    const targetBranch = await context.provider.branch(this.targetBranchName);

    const pkg = new Package('package.json');
    const properties = {};

    Object.assign(properties, await pkg.properties(targetBranch));

    let templateBranch;

    if (context.templateBranchName === undefined) {
      try {
        templateBranch = await context.provider.branch(
          context.properties.templateRepo
        );
      } catch (e) {}

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    } else {
      templateBranch = await context.provider.branch(this.templateBranchName);
    }

    Object.defineProperties(this, {
      templateBranch: { value: templateBranch },
      targetBranch: { value: targetBranch },
      properties: { value: properties }
    });
  }

  async createFiles(branch, mapping = this.context.defaultMapping) {
    const files = await branch.list();
    let alreadyPresent = new Set();

    return mapping
      .map(m => {
        const found = mm(
          files.filter(f => f.type === 'blob').map(f => f.path),
          m.pattern
        );

        const notAlreadyProcessed = found.filter(f => !alreadyPresent.has(f));

        alreadyPresent = new Set([...Array.from(alreadyPresent), ...found]);

        return notAlreadyProcessed.map(f => {
          const merger =
            mergers.find(merger => merger.name === m.merger) || ReplaceIfEmpty;
          return new merger(f, m.options);
        });
      })
      .reduce((last, current) => Array.from([...last, ...current]), []);
  }

  addFile(file) {
    this.files.set(file.path, file);
  }

  /**
   * all used dev modules
   * @return {Set<string>}
   */
  async usedDevModules() {
    const usedModuleSets = await Promise.all(
      Array.from(this.files.values()).map(async file => {
        if (file.path === 'package.json') {
          return file.usedDevModules(
            file.targetContent(this, { ignoreMissing: true })
          );
        } else {
          const m = await file.merge(this);
          return file.usedDevModules(m.content);
        }
      })
    );

    return usedModuleSets.reduce(
      (sum, current) => new Set([...sum, ...current]),
      new Set()
    );
  }

  optionalDevModules(modules) {
    return Array.from(this.files.values())
      .map(file => file.optionalDevModules(modules))
      .reduce((sum, current) => new Set([...sum, ...current]), new Set());
  }
}
