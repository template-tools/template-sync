import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

/**
 * Overwrites none existing entries from template
 */
export class ReplaceIfEmpty extends Merger {
  static get priority() {
    return 0.1;
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    if (await destinationEntry.isEmpty()) {
      const source = await sourceEntry.getString();

      yield {
        message: `${options.messagePrefix}add missing ${destinationEntry.name} from template`,
        entries: [
          new StringContentEntry(
            destinationEntry.name,
            options.expand ? context.expand(source) : source
          )
        ]
      };
    }
  }
}
