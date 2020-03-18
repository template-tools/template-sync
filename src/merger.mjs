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
      mergeHints: {}
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

  static optionalDevDependencies(dependencies, options = {}) {
    return new Set(
      Array.from(dependencies).filter(dep => {
        if (options.optionalDevDependencies) {
          for (const r of options.optionalDevDependencies) {
            if (dep.match(r)) return true;
          }
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
}
