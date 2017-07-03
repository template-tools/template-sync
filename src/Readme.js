import File from './File';

export default class Readme extends File {
  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: true
      }),
      this.templateContent(),
      this.context.files.get('package.json').templateContent()
    ]).then(([original, template, pkg]) => {
      const p = JSON.parse(pkg);
      const badges =
        p.template && p.template.badges
          ? p.template.badges.map(b =>
              this.context.expand(`[![${b.name}](${b.icon})](${b.url})`)
            )
          : [];

      let body = original.split(/\n/);

      if (body.length === 0) {
        body = this.context.expand(template).split(/\n/);
      } else {
        body = body.slice(body.findIndex(l => l.length === 0));
        body = body.slice(body.findIndex(l => l.length > 0));
      }

      const content = [...badges, '', ...body].join('\n');
      return {
        path: this.path,
        content,
        changed: content !== original,
        messages: ['docs(README): update from template']
      };
    });
  }
}
