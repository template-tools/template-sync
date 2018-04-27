import { createContext } from 'expression-expander';
import { value } from 'jsonpath';

/**
 * @param {Branch} targetBranch
 * @param {Branch} templateBranch
 * @param {Object} properties
 * @param {Object} options
 *
 * @property {Branch} targetBranch
 * @property {Branch} templateBranch
 * @property {Object} properties
 * @property {Object} options
 */
export class Context {
  constructor(targetBranch, templateBranch, properties, options) {
    options = Object.assign(
      {},
      {
        logger: console,
        dry: false,
        trackUsedByModule: false
      },
      options
    );

    this.ctx = createContext({
      keepUndefinedValues: true,
      leftMarker: '{{',
      rightMarker: '}}',
      markerRegexp: '{{([^}]+)}}',
      evaluate: (expression, context, path) => value(properties, expression)
    });

    this.ctx.properties = properties;

    Object.defineProperties(this, {
      properties: {
        value: properties
      },
      files: {
        value: new Map()
      },
      targetBranch: {
        value: targetBranch
      },
      templateBranch: {
        value: templateBranch,
        writable: true
      }
    });

    Object.assign(this, options);
  }

  expand(...args) {
    return this.ctx.expand(...args);
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
            file.originalContent(this, { ignoreMissing: true })
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

  set text(value) {
    if (this.spinner === undefined) {
      console.log(value);
    } else {
      this.spinner.text = value;
    }
  }

  succeed(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.succeed(...args);
    }
  }

  warn(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.warn(...args);
    }
  }

  fail(...args) {
    if (this.spinner === undefined) {
      console.log(...args);
    } else {
      this.spinner.fail(...args);
    }
  }
}
