/**
 * Mergable content
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

  static optionalDevDependencies(into, dependencies, options = this.defaultOptions) {
    if (options.optionalDevDependencies) {
      Array.from(dependencies).forEach(dep => {
        for (const r of options.optionalDevDependencies) {
          if (dep.match(r)) into.add(dep);
        }
      });
    }

    return into;
  }

  static usedDevDependencies(into, entry) {
    return into;
  }

  static async merge(context, destinationEntry, sourceEntry, options) {
    return undefined;
  }
}
