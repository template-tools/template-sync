import { Merger } from "../merger.mjs";

/**
 * Overwrites none existing entries from template
 */
export class ReplaceIfEmpty extends Merger {

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    return (await destinationEntry.isEmpty())
      ? {
          message: `${options.messagePrefix}add missing {{entry.name}} from template`,
          entry: sourceEntry
        }
      : undefined;
  }
}
