import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

/**
 * Replace file from template (always)
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
    let source = await sourceEntry.getString();
    if (options.expand) {
      source = context.expand(source);
    }

    if ((await destinationEntry.getString()) !== source) {
      yield {
        message: `${options.messagePrefix}overwrite {{entry.name}} with template content`,
        entry: new StringContentEntry(destinationEntry.name, source)
      };
    }
  }
}
