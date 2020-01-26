import { Merger } from "../merger.mjs";

/**
 * Overwrites none existing file from template
 */
export class ReplaceIfEmpty extends Merger {
  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, template) {
    return original === ''
      ? {
          content: this.options.expand ? context.expand(template) : template,
          changed: template !== '',
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
