import { PreparedContext } from "./prepared-context";

export { PreparedContext };

/**
 * @param {RepositoryProvider} provider
 * @param {Object} options
 *
 * @property {RepositoryProvider} provider
 * @property {Object} options
 * @property {string} options.templateBranchName
 */
export class Context {
  static get defaultMapping() {
    return [
      { merger: "Package", pattern: "**/package.json" },
      { merger: "Travis", pattern: ".travis.yml" },
      { merger: "Readme", pattern: "**/README.*" },
      { merger: "JSDoc", pattern: "**/jsdoc.json" },
      { merger: "Rollup", pattern: "**/rollup.config.js" },
      { merger: "License", pattern: "LICENSE" },
      {
        merger: "MergeAndRemoveLineSet",
        pattern: ".gitignore",
        options: { message: "chore(git): update {{entry.name}} from template" }
      },
      {
        merger: "NpmIgnore",
        pattern: ".npmignore",
        options: { message: "chore(npm): update {{entry.name}} from template" }
      },
      { merger: "ReplaceIfEmpty", pattern: "**/*" }
    ];
  }

  constructor(provider, options) {
    options = Object.assign(
      {},
      {
        logger: console,
        dry: false,
        trackUsedByModule: false
      },
      options
    );

    options.properties = Object.assign(
      {
        date: { year: new Date().getFullYear() },
        license: {}
      },
      options.properties
    );

    Object.defineProperties(this, {
      trackUsedByModule: {
        value: options.trackUsedByModule
      },
      dry: {
        value: options.dry
      },
      logger: {
        value: options.logger
      },
      provider: {
        value: provider
      },
      properties: {
        value: options.properties
      },
      templateBranchName: {
        value: options.templateBranchName
      }
    });
  }

  get defaultMapping() {
    return this.constructor.defaultMapping;
  }

  log(arg) {
    const prefixKeys = {
      branch: 1,
      level: "info"
    };
    const valueKeys = {
      message: "v",
      timestamp: "d"
    };

    const prefix = Object.keys(prefixKeys).reduce((a, c) => {
      if (arg[c]) {
        if(prefixKeys[c] !== arg[c]) {
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
