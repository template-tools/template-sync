/* jslint node: true, esnext: true */

export default function (target, template, options = {}) {
  target = JSON.parse(target);
  template = JSON.parse(template);

  Object.assign(target.devDependencies, template.devDependencies);
  Object.assign(target.scripts, template.scripts);
  Object.assign(target.engines, template.engines);

  return JSON.stringify(target, undefined, 2);

  /*
    pkg.repository = {
      type: 'git',
      url: `https://github.com/${user}/${repo}.git`
    };
    pkg.bugs = {
      url: `https://github.com/${user}/${repo}/issues`
    };
    pkg.homepage = `https://github.com/${user}/${repo}#readme`;

    pkg.version = '0.0.0-semantic-release';

    pkg.license = 'BSD-2-Clause';

    if (pkg.keywords === undefined) {
      pkg.keywords = [];
    }

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

    if (pkg.config === undefined) {
      pkg.config = {};
    }
    pkg.config.commitizen = {
      path: './node_modules/cz-conventional-changelog'
    };
  */
}
