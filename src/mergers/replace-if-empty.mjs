import { Merger } from "../merger.mjs";

/**
 * Overwrites none existing entries from template
 */
export class ReplaceIfEmpty extends Merger {
  get needsTemplate() {
    return false;
  }

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

  async mergeContent(context, original, template) {
    return original === ""
      ? {
          content: this.options.expand ? context.expand(template) : template,
          changed: template !== "",
          messages: [
            this.options.message ||
              `chore: add missing ${this.name} from template`
          ]
        }
      : {
          name: this.name,
          content: original,
          changed: false
        };
  }
}
