import File from './file';

export default class Readme extends File {
  static matchesFileName(name) {
    return name.match(/README\./);
  }

  async mergeContent(context, original, template) {
    const pkg = await context.files
      .get('package.json')
      .templateContent(context);

    const p = JSON.parse(pkg);
    const badges =
      p.template && p.template.badges
        ? p.template.badges.map(b =>
            context.expand(`[![${b.name}](${b.icon})](${b.url})`)
          )
        : [];

    let body = original.split(/\n/);

    if (body.length === 0) {
      body = context.expand(template).split(/\n/);
    } else {
      body = body.slice(body.findIndex(l => l.length === 0));
      body = body.slice(body.findIndex(l => l.length > 0));
    }

    const content = [...badges, '', ...body].join('\n');
    return {
      content,
      changed: content !== original,
      messages: ['docs(README): update from template']
    };
  }
}
