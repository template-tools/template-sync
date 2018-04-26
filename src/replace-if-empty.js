import { File } from './file';

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
              `chore: add missing ${this.path} from template`
          ]
        }
      : {
          path: this.path,
          content: original,
          changed: false
        };
  }
}
