/* jslint node: true, esnext: true */

export default function (left, right, options = {}) {
  const pkg = JSON.parse(left);

  const {
    user, repo
  } = options;

  pkg.repository = {
    type: 'git',
    url: `https://github.com/${user}/${repo}.git`
  };
  pkg.bugs = {
    url: `https://github.com/${user}/${repo}/issues`
  };
  pkg.homepage = `https://github.com/${user}/${repo}#readme`;

  pkg.version = '0.0.0-semantic-release';

  if (pkg.release && pkg.release.debug === false) {
    delete pkg.release;
  }

  Object.assign(pkg.devDependencies, {
    'semantic-release': '6.3.1',
    'chai': '3.5.0',
    'mocha': '3.1.0',
    'jsdoc': '3.4.0',
    'istanbul': '0.4.5',
    'cz-conventional-changelog': '1.2.0'
  });

  Object.assign(pkg.scripts, {
    'semantic-release': 'semantic-release pre && npm publish && semantic-release post',
    doc: './node_modules/.bin/jsdoc lib/*.js',
    test: './node_modules/.bin/mocha tests/*_test.js',
    cover: './node_modules/istanbul/lib/cli.js cover --hook-run-in-context ./node_modules/mocha/bin/_mocha -- --R spec --U exports tests/*_test.js'
  });

  pkg.engines = {
    node: '>=6.6'
  };

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

  return JSON.stringify(pkg, undefined, 2);
}
