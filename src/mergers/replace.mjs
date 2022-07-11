import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

/**
 * Always overwrite entry from template
 */
export class Replace extends Merger {
  static get priority() {
    return 0.1;
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const source = context.expand(
      await sourceEntry.string,
      options.expand
    );

    if ((await destinationEntry.string) !== source) {
      yield {
        message: `${options.messagePrefix}overwrite ${destinationEntry.name} with template content`,
        entries: [new StringContentEntry(destinationEntry.name, source)]
      };
    }
  }
}
