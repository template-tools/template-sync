import { File } from './file';
import { templateOptions } from './util';

/**
 * injects badges into REAMDE.md
 */
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
    const [pkg, pkgTemplate] = await context.files
      .get('package.json')
      .content(context);

    const p = pkg.length === 0 ? {} : JSON.parse(pkg);
    const pTemplate = JSON.parse(pkgTemplate);

    console.log(this.options);

    const badges = this.options.badges
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
