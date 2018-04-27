import { File } from './file';
import { templateOptions } from './util';

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

    const badges = this.options.badges
      /*pTemplate.template && pTemplate.template.badges
        ? pTemplate.template.badges*/
      .map(b => {
        const m = templateOptions(p, 'Readme');

        // TODO do not alter global properties use private layer here
        if (m.badges !== undefined) {
          Object.assign(context.properties, m.badges[b.name]);
        }

        const r = context.expand(`[![${b.name}](${b.icon})](${b.url})`);

        if (r.match(/\{\{/)) {
          return '';
        }
        return r;
      })
      .filter(b => b.length > 0);

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
