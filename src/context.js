import { createContext } from 'expression-expander';
import { value } from 'jsonpath';

import { Travis } from './travis';
import { Readme } from './readme';
import { Package } from './package';
import { Rollup } from './rollup';
import { License } from './license';
import { MergeAndRemoveLineSet } from './merge-and-remove-line-set';
import { MergeLineSet } from './merge-line-set';
import { ReplaceIfEmpty } from './replace-if-empty';
import { Replace } from './replace';
import { JSONFile } from './json-file';
import { JSDoc } from './jsdoc';

const mm = require('micromatch');

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
  static get merges() {
    return [
      Rollup,
      Travis,
      Readme,
      Package,
      JSONFile,
      JSDoc,
      Travis,
      MergeAndRemoveLineSet,
      MergeLineSet,
      License,
      ReplaceIfEmpty,
      Replace
    ];
  }

  static get defaultMapping() {
    return [
      { merger: 'Package', pattern: '**/package.json' },
      { merger: 'Travis', pattern: '.travis.yml' },
      { merger: 'Readme', pattern: '**/README.*' },
      { merger: 'JSDoc', pattern: '**/jsdoc.json' },
      { merger: 'Rollup', pattern: '**/rollup.config.js' },
      { merger: 'License', pattern: 'LICENSE' },
      {
        merger: 'MergeAndRemoveLineSet',
        pattern: '.gitignore',
        options: { message: 'chore(git): update {{path}} from template' }
      },
      {
        merger: 'MergeAndRemoveLineSet',
        pattern: '.npmignore',
        options: { message: 'chore(npm): update {{path}} from template' }
      },
      { merger: 'ReplaceIfEmpty', pattern: '**/*' }
    ];
  }

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

  get defaultMapping() {
    return this.constructor.defaultMapping;
  }

  async createFiles(branch, mapping = this.defaultMapping) {
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


  await execute()
  {
    
  }
}
