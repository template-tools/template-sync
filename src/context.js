import { PreparedContext } from './prepared-context';

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
        'date.year': new Date().getFullYear()
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

  debug(...args) {
    if (this.logger === undefined) {
      this.logger.debug(...args);
    } else {
      this.logger.debug(...args);
    }
  }

  set text(value) {
    if (this.spinner === undefined) {
      this.logger.log(value);
    } else {
      this.spinner.text = value;
    }
  }

  succeed(...args) {
    if (this.spinner === undefined) {
      this.logger.log(...args);
    } else {
      this.spinner.succeed(...args);
    }
  }

  warn(...args) {
    if (this.spinner === undefined) {
      this.logger.warn(...args);
    } else {
      this.spinner.warn(...args);
    }
  }

  info(...args) {
    if (this.spinner === undefined) {
      this.logger.info(...args);
    } else {
      this.spinner.info(...args);
    }
  }

  fail(...args) {
    if (this.spinner === undefined) {
      this.logger.error(...args);
    } else {
      this.spinner.fail(...args);
    }
  }
}
