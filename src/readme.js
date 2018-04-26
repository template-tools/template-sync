import { File } from './file';

export class Readme extends File {
  static matchesFileName(name) {
    return name.match(/README\./);
  }

  static get defaultOptions() {
    return {
      badges: []
    };
  }

  async mergeContent(context, original, template) {
    const pkgTemplate = await context.files
      .get('package.json')
      .templateContent(context);
    const pkg = await context.files
      .get('package.json')
      .originalContent(context);

    const p = JSON.parse(pkg);
    const pTemplate = JSON.parse(pkgTemplate);

    const badges =
      pTemplate.template && pTemplate.template.badges
        ? pTemplate.template.badges
            .map(b => {
              // TODO do not alter global properties use private layer here
              if (p.template !== undefined && p.template.badges !== undefined) {
                Object.assign(context.properties, p.template.badges[b.name]);
              }

              const r = context.expand(`[![${b.name}](${b.icon})](${b.url})`);

              if (r.match(/\{\{/)) {
                return '';
              }
              return r;
            })
            .filter(b => b.length > 0)
        : [];

    let body = original.split(/\n/);

    if (body.length === 0) {
      body = context.expand(template).split(/\n/);
    } else {
      body = body.filter(l => !l.match(/^\[\!\[.*\)$/));
    }

    const content = [...badges, ...body].join('\n');
    return {
      content,
      changed: content !== original,
      messages: ['docs(README): update from template']
    };
  }
}
