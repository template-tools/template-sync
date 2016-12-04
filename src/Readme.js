/* jslint node: true, esnext: true */
import File from './File';

export default class Readme extends File {
  get mergedContent() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const [original, template] = contents;

      const tLines = this.context.expand(template).split(/\n/);
      const badges = tLines.slice(0, tLines.findIndex(l => l.length === 0));
      const lines = original.split(/\n/);
      const fel = lines.findIndex(l => l.length === 0);

      return badges.join('\n') + '\n' +
        lines.slice(fel).join('\n');
    });
  }
}
