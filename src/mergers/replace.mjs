import { StringContentEntry } from "content-entry"; 
import { Merger } from "../merger.mjs";

/**
 * Replace file from template (always)
 */
export class Replace extends Merger {
  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const source = await sourceEntry.getString();
    return (await destinationEntry.getString()) === source
      ? undefined
      : {
          message: `${options.messagePrefix}overwrite {{entry.name}} with template content`,
          entry: new StringContentEntry(destinationEntry.name, source)
        };
  }
}
