import { Content, emptyContent } from "repository-provider";

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
    let target, template;

    try {
      target = await context.targetBranch.content(this.path);
    } catch (e) {
      if (this.needsOriginal) {
        throw e;
      }
      target = emptyContent(this.path);
    }

    try {
      template = await context.templateBranch.content(this.path);
    } catch (e) {
      if (this.needsTemplate) {
        throw e;
      }
      template = emptyContent(this.path);
    }

    return [target.toString(), template.toString()];
  }

  async mergeContent(context, original, template) {
    return {
      changed: false,
      content: original
    };
  }

  /**
   * @param {PreparedContect} context
   * @return {Object} merged content
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
      context.error(
        `${
          context.targetBranch
            ? context.targetBranch.fullCondensedName
            : "unknown"
        },${this.path}: ${err}`
      );
      return {
        path: this.path,
        changed: false
      };
    }
  }
}
