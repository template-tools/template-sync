import { Merger } from "../merger.mjs";

/**
 * Does not generate destination entry
 */
export class Skip extends Merger {
  static async merge(
    context,
    destinationEntry,
    sourceEntry,
  ) {
    return undefined;
  }
}
