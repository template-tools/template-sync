import File from './file';

export default class ReplaceIfEmpty extends File {
  constructor(path, messages) {
    super(path);

    Object.defineProperty(this, 'messages', {
      value: messages
    });
  }

  async merge(context) {
    const [original, template] = await Promise.all([
      this.originalContent(context, {
        ignoreMissing: true
      }),
      this.templateContent(context, {
        ignoreMissing: true
      })
    ]);

    return original === ''
      ? {
          path: this.path,
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
