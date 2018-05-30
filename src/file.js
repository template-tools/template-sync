/**
 * Mergable File
 * @param {string} path location in the repository
 * @param {Object} options mergin options
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

  async targetContent(context, options) {
    return (await context.targetBranch.content(this.path, options)).content;
  }

  async content(context) {
    return (await Promise.all([
      context.targetBranch.content(this.path, {
        ignoreMissing: !this.needsOriginal
      }),
      context.templateBranch.content(this.path, {
        ignoreMissing: !this.needsTemplate
      })
    ])).map(c => c.content);
  }

  async mergeContent(context, original, template) {
    return {
      changed: false,
      content: original
    };
  }

  /**
   * @param {PreparedContect} context
   * @return
   */
  async merge(context) {
    try {
      const [original, template] = await this.content(context);
      const result = await this.mergeContent(context, original, template);
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
      context.fail(
        `${
          context.targetBranch
            ? context.targetBranch.fullCondensedName
            : 'unknown'
        },${this.path}: ${err}`
      );
      return {
        path: this.path,
        changed: false
      };
    }
  }
}
