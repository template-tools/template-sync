/* jslint node: true, esnext: true */
import File from './File';

export default class Readme extends File {
  get mergedContent() {
    return Promise.all([
        this.originalContent({
          ignoreMissing: true
        }),
        this.templateContent(),
        this.context.files.get('package.json').templateContent()
      ])
      .then(contents => {
        const [original, template, pkg] = contents;
        const p = JSON.parse(pkg);
        const badges = p.template && p.template.badges ? p.template.badges.map(b =>
          this.context.expand(`[![${b.name}](${b.icon})](${b.url})`)
        ) : [];

        let body = original.split(/\n/);

        if (body.length === 0) {
          body = this.context.expand(template).split(/\n/);
        } else {
          body = body.slice(body.findIndex(l => l.length === 0));
          body = body.slice(body.findIndex(l => l.length > 0));
        }

        return [...badges, '', ...body].join('\n');
      });
  }
}
