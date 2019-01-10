import { EmptyContentEntry } from "content-entry/src/empty-content-entry";

/**
 * Mergable File
 * @param {string} name location in the repository
 * @param {Object} options mergin options
 *
 * @property {string} name
 * @property {Object} options
 */
export class File {
  static matchesFileName(name) {
    return false;
  }

  static get defaultOptions() {
    return {};
  }

  constructor(name, options = {}) {
    Object.defineProperties(this, {
      name: {
        value: name
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

  async targetEntry(context, options) {
    return (await context.targetBranch.entry(this.name, options)).getString();
  }

  async content(context) {
    let target, template;

    try {
      target = await context.targetBranch.entry(this.name);
    } catch (e) {
      if (this.needsOriginal) {
        throw e;
      }
      target = new EmptyContentEntry(this.name);
    }

    try {
      template = await context.templateBranch.entry(this.name);
    } catch (e) {
      if (this.needsTemplate) {
        throw e;
      }
      template = new EmptyContentEntry(this.name);
    }

    return Promise.all([target.getString(), template.getString()]);
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
      context.debug({ message: "merge", name: this.name });
      const [original, template] = await this.content(context);
      const result = await this.mergeContent(context, original, template);
      if (result === undefined) {
        return {
          name: this.name,
          changed: false
        };
      }
      result.name = this.name;

      context.properties.entry = { name: this.name };
      result.messages = context.expand(result.messages);

      context.debug({ name: this.name, changes: result.changed });

      return result;
    } catch (err) {
      context.error(err);

      return {
        name: this.name,
        changed: false
      };
    }
  }
}
