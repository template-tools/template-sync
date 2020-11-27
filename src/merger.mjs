/**
 * Mergable content
 */
export class Merger {
  static get pattern() {
    return "**/*";
  }

  static get priority() {
    return 1.0;
  }

  static get options() {
    return {
      messagePrefix: "",
      expand: true,
      mergeHints: {}
    };
  }

  /**
   * Deliver some key properties.
   * @param {ContentEntry} entry
   * @return {Object} extracted properties
   */
  static async properties(entry) {
    return {};
  }

  static optionalDevDependencies(into, dependencies, options = this.options) {
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

  /**
   * Generate commits as result of merging two entries.
   */
  static async *commits(context, destinationEntry, sourceEntry, options) {
  }
}
