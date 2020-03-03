import { EmptyContentEntry } from "content-entry/src/empty-content-entry.mjs";
import { StringContentEntry } from "content-entry";

/**
 * Mergable File
 * @param {string} name location in the repository
 * @param {Object} options mergin options
 *
 * @property {string} name
 * @property {Object} options
 */
export class Merger {
  static get pattern() {
    return "**/*";
  }

  static get defaultOptions() {
    return {
      messagePrefix: "",
      expand: true,
      mergeHints: {},
      optionalDevDependencies: []
    };
  }

  /**
   * Deliver some key properties
   * @param {ContentEntry} entry
   * @return {Object}
   */
  static async properties(entry) {
    return {};
  }

  static optionalDevDependencies(
    dependencies,
    options = { optionalDevDependencies: [] }
  ) {
    return new Set(
      Array.from(dependencies).filter(dep => {
        for (const r of options.optionalDevDependencies) {
          if (dep.match(r)) return true;
        }
        return false;
      })
    );
  }

  static usedDevDependencies(content) {
    return new Set();
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const name = destinationEntry.name;
    const merger = new this(context, name, options);
    const result = await merger.mergeContent(
      context,
      await destinationEntry.getString(),
      await sourceEntry.getString()
    );

    return {
      message: result.messages.join(""),
      entry: new StringContentEntry(name, result.content)
    };
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

  async targetEntry(context, options) {
    return (await context.targetBranch.entry(this.name, options)).getString();
  }

  async content(context) {
    let target, template;

    const targetName = context.expand(this.name);

    try {
      target = await context.targetBranch.entry(targetName);
    } catch (e) {
      target = new EmptyContentEntry(targetName);
    }

    template = await context.template.entry(this.name);

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
