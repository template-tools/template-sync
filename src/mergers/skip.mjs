import { Merger } from "../merger.mjs";

/**
 * Does not generate destination entry
 */
export class Skip extends Merger {
  static get priority() {
    return 1.1;
  }
}
