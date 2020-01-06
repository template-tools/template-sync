import { EmptyContentEntry } from "content-entry/src/empty-content-entry.mjs";

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
    return { messagePrefix: "", expand: true, mergeHints: {} };
  }

  constructor(name, options = {}) {
    Object.defineProperties(this, {
      name: {
        value: name
      },
      options: {
        value: { ...this.defaultOptions, ...options }
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

  optionalDevDependencies(modules) {
    return new Set();
  }

  usedDevDependencies(content) {
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
    let target;

    const targetName = context.expand(this.name);

    try {
      target = await context.targetBranch.entry(targetName);
    } catch (e) {
      if (this.needsOriginal) {
        throw e;
      }
      target = new EmptyContentEntry(targetName);
    }

    let template = this.template;
    if (template === undefined) {
      try {
        template = await context.templateBranch.entry(this.name);
      } catch (e) {
        if (this.needsTemplate) {
          throw e;
        }
        template = new EmptyContentEntry(this.name);
      }
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
      const targetName = context.expand(this.name);

      context.debug({ message: "merge", name: this.name });
      const [original, template] = await this.content(context);
      const result = await this.mergeContent(context, original, template);
      if (result === undefined) {
        return {
          name: targetName,
          changed: false
        };
      }
      result.name = targetName;

      context.properties.entry = { name: targetName };
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
