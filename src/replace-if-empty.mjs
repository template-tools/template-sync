import { File } from './file.mjs';

/**
 * Overwrites none existing file from template
 */
export class ReplaceIfEmpty extends File {
  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, template) {
    return original === ''
      ? {
          content: context.expand(template),
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
