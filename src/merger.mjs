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
   * Deliver some key properties
   * @param {ContentEntry} entry
   * @return {Object}
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

  static async merge(context, destinationEntry, sourceEntry, options) {
    return undefined;
  }

  static async *commits(context, destinationEntry, sourceEntry, options) {
    const commit = await this.merge(
      context,
      destinationEntry,
      sourceEntry,
      options
    );
    if (commit) {
      yield { message: commit.message, entries: [commit.entry] };
    }
  }
}
