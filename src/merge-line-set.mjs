import { File } from "./file";

/**
 * File where every line is a key
 */
export class MergeLineSet extends File {
  /**
   * entries to be skipped from result
   * @return {Set<string>}
   */
  get defaultIgnoreSet() {
    return new Set();
  }

  async mergeContent(context, original, template) {
    const result = new Set(template.split(/\n/));
    original.split(/\r?\n/).forEach(line => result.add(line));

    this.defaultIgnoreSet.forEach(entry => result.remove(entry));

    const content = Array.from(result.values()).join("\n");

    return {
      content,
      changed: content !== original,
      messages: [
        this.options.message || "fix: update {{entry.name}} from template"
      ]
    };
  }
}
