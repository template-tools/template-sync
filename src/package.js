/* jslint node: true, esnext: true */

function addKeyword(pkg, regex, keyword) {
  if (pkg.name.match(regex)) {
    if (!pkg.keywords.find(k => k === keyword)) {
      pkg.keywords.push(keyword);
    }
  }
}

export default function (target, template, context, options = {}) {
  target = JSON.parse(target);
  template = JSON.parse(template);

  context.properties.module = target.module;
  context.properties.main = target.main || 'indes.js';

  const deepPropeties = ['scripts', 'devDependencies', 'engines'];


  let extraBuild;

  if (target.scripts && target.scripts.build) {
    const m = target.scripts.build.match(/\&\&\s*(.+)/);
    if (m) {
      extraBuild = m[1];
    }
  }

  deepPropeties.forEach(p => {
    if (target[p] === undefined) {
      target[p] = {};
    }
    Object.assign(target[p], template[p]);
  });

  Object.keys(template).forEach(p => {
    if (p !== 'template') {
      if (target[p] === undefined) {
        target[p] = template[p];
      }
    }
  });

  if (extraBuild) {
    target.scripts.build += ` && ${extraBuild}`;
  }

  if (target.module === '{{module}}') {
    delete target.module;
  }

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

  if (template.config && template.config.keywords) {
    Object.keys(template.config.keywords).forEach(r =>
      addKeyword(target, new RegExp(r), template.config.keywords[r])
    );
  }

  /* TODO move data into template
  addKeyword(target, /^kronos-interceptor.+/, 'kronos-interceptor');
  addKeyword(target, /^kronos-service.+/, 'kronos-service');
  addKeyword(target, /^kronos-step.+/, 'kronos-step');
  addKeyword(target, /^kronos-adapter.+/, 'kronos-step');
  */

  return JSON.stringify(context.expand(target), undefined, 2);
}
