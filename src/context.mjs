export * from "./prepared-context.mjs";
export * from "./template.mjs";

import { asArray } from './util.mjs'; 

/**
 * @param {RepositoryProvider} provider
 * @param {Object} options
 *
 * @property {RepositoryProvider} provider
 * @property {Object} options
 * @property {string[]} options.templates
 */
export class Context {
  constructor(provider, options={}) {
    Object.defineProperties(this, {
      trackUsedByModule: {
        value: options.trackUsedByModule || false
      },
      dry: {
        value: options.dry || false
      },
      logger: {
        value: options.logger || console
      },
      provider: {
        value: provider
      },
      properties: {
        value: {
          date: { year: new Date().getFullYear() },
          license: {},
          templateSources: asArray(options.templateSources),
          ...options.properties
        }
      }
    });
  }

  log(arg) {
    const prefixKeys = {
      branch: 1,
      severity: "info"
    };
    const valueKeys = {
      message: "v",
      timestamp: "d"
    };

    const prefix = Object.keys(prefixKeys).reduce((a, c) => {
      if (arg[c]) {
        if (prefixKeys[c] !== arg[c]) {
          a.push(arg[c]);
        }
        delete arg[c];
      }
      return a;
    }, []);

    const values = Object.keys(arg).reduce((a, c) => {
      if (arg[c] !== undefined) {
        switch (valueKeys[c]) {
          case "v":
            a.push(arg[c]);
            break;
          case "d":
            break;
          default:
            a.push(`${c}=${JSON.stringify(arg[c])}`);
        }
      }
      return a;
    }, []);

    console.log(`${prefix.join(",")}: ${values.join(" ")}`);
  }
}
