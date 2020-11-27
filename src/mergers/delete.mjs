import { DeletedContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

/**
 * Delete entry.
 */
export class Delete extends Merger {
  static get priority() {
    return 0.1;
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    yield {
      message: `${options.messagePrefix}delete {{entry.name}}`,
      entries: [new DeletedContentEntry(destinationEntry.name)]
    };
  }
}
