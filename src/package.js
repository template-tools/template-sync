/* jslint node: true, esnext: true */


export default function (target, template, context, options = {}) {
  target = JSON.parse(target);
  template = JSON.parse(template);

  context.properties.module = target.module;
  context.properties.main = target.main;

  const deepPropeties = ['scripts', 'devDependencies', 'engines'];

  deepPropeties.forEach(p => {
    if (target[p] === undefined) {
      target[p] = {};
    }
  });

  Object.assign(target.devDependencies, template.devDependencies);
  Object.assign(target.scripts, template.scripts);
  Object.assign(target.engines, template.engines);

  Object.keys(template).forEach(p => {
    if (target[p] === undefined) {
      target[p] = template[p];
    }
  });

  if (target.contributors !== undefined && target.author !== undefined) {
    const m = target.author.match(/(^[^<]+)<([^>]+)>/);
    if (m !== undefined) {
      const name = String(m[1]).replace(/^\s+|\s+$/g, '');
      const email = m[2];

      if (target.contributors.find(c => c.name === name && c.email === email)) {
        delete target.author;
      }
    }
  }

  const [user, repo] = options.targetRepo.split(/\//);

  return JSON.stringify(context.expand(target), undefined, 2);

  /*
    if (pkg.name.match(/^kronos-interceptor.+/)) {
      if (!pkg.keywords.find(k => k === 'kronos-interceptor')) {
        pkg.keywords.push('kronos-interceptor');
      }
    }
    if (pkg.name.match(/^kronos-step.+/) || pkg.name.match(/^kronos-adapter.+/)) {
      if (!pkg.keywords.find(k => k === 'kronos-step')) {
        pkg.keywords.push('kronos-step');
      }
    }
    if (pkg.name.match(/^kronos-service.+/) && !pkg.name.match(/^kronos-service-manager/)) {
      if (!pkg.keywords.find(k => k === 'kronos-service')) {
        pkg.keywords.push('kronos-service');
      }
    }
  */
}
