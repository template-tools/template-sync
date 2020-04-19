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
      mergeHints: { "*" : {}}
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

  static usedDevDependencies(entry) {
    return new Set();
  }

  static async merge(context, destinationEntry, sourceEntry, options) {
    return undefined;
  }
}
