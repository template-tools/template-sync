import File from './File';

export default class ReplaceIfEmpty extends File {
  constructor(context, path, messages) {
    super(context, path);

    Object.defineProperty(this, 'messages', {
      value: messages
    });
  }

  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: true
      }),
      this.templateContent({
        ignoreMissing: true
      })
    ]).then(([original, template]) => {
      return original === ''
        ? {
            path: this.path,
            content: this.context.expand(template),
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
    });
  }
}
