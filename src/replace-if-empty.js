import File from './file';

export default class ReplaceIfEmpty extends File {
  constructor(path, messages) {
    super(path);

    Object.defineProperty(this, 'messages', {
      value: messages
    });
  }

  get needsTemplate() {
    return false;
  }

  async mergeContent(context, original, template) {
    return original === ''
      ? {
          content: context.expand(template),
          changed: template !== '',
          messages:
            this.messages === undefined
              ? [`chore: add missing ${this.path} from template`]
              : this.messages
        }
      : {
          path: this.path,
          content: original,
          changed: false
        };
  }
}
