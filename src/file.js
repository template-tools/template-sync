/**
 * @param {string} path
 * @param {Object} options
 *
 * @property {string} path
 * @property {Object} options
 */
export class File {
  static matchesFileName(name) {
    return false;
  }

  static get defaultOptions() {
    return {};
  }

  constructor(path, options = {}) {
    Object.defineProperties(this, {
      path: {
        value: path
      },
      options: {
        value: Object.assign({}, this.defaultOptions, options)
      }
    });
  }

  get defaultOptions() {
    return this.constructor.defaultOptions;
  }

  get needsTemplate() {
    return true;
  }

  get needsOriginal() {
    return false;
  }

  optionalDevModules(modules) {
    return new Set();
  }

  usedDevModules(content) {
    return new Set();
  }

  /**
   * Deliver some key properties
   * @param {Branch} branch
   * @return {Object}
   */
  async properties(branch) {
    return {};
  }

  async mergeContent(context, original, template) {
    return {
      changed: false,
      content: original
    };
  }

  async merge(context, targetBranch, templateBranch) {
    try {
      const [original, template] = (await Promise.all([
        targetBranch.content(this.path, {
          ignoreMissing: !this.needsOriginal
        }),
        templateBranch.content(this.path, {
          ignoreMissing: !this.needsTemplate
        })
      ])).map(c => c.content);

      const result = this.mergeContent(context, original, template);

      if (result === undefined) {
        return {
          path: this.path,
          changed: false
        };
      }
      result.path = this.path;

      context.properties.path = this.path;
      result.messages = context.expand(result.messages);

      return result;
    } catch (err) {
      context.fail(`${targetBranch.fullCondensedName},${this.path}: ${err}`);
      return {
        path: this.path,
        changed: false
      };
    }
  }

  async content(branch, ...args) {
    const content = await branch.content(...args);
    return content.content;
  }
}
