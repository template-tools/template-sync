/* jslint node: true, esnext: true */
import File from './File';

export default class Readme extends File {
  get mergedContent() {
    return Promise.all([
        this.originalContent(),
        this.templateContent(),
        this.context.files.get('package.json').templateContent()
      ])
      .then(contents => {
        const [original, template, pkg] = contents;
        const p = JSON.parse(pkg);
        const badges = p.template && p.template.badges ? p.template.badges.map(b =>
          this.context.expand(`[![${b.name}](${b.icon})](${b.url})`)
        ) : [];

        const tLines = this.context.expand(template).split(/\n/);
        const lines = original.split(/\n/);
        const fel = lines.findIndex(l => l.length === 0);

        return badges.join('\n') + '\n' +
          lines.slice(fel).join('\n');
      });
  }
}
