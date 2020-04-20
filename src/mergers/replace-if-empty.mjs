import { StringContentEntry } from "content-entry"; 
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
    if(await destinationEntry.isEmpty()) {
      const source = await sourceEntry.getString();

      return {
        message: `${options.messagePrefix}add missing ${destinationEntry.name} from template`,
        entry: new StringContentEntry(destinationEntry.name,
           options.expand ? context.expand(source) : source)
      };
    }
    return undefined;
  }
}
