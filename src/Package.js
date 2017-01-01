/* jslint node: true, esnext: true */
import File from './File';

export default class Package extends File {
  get mergedContent() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const target = JSON.parse(contents[0]);
      const template = JSON.parse(contents[1]);

      const properties = this.context.properties;

      if (target.module && !target.module.match(/\{\{module\}\}/)) {
        properties.module = target.module;
      }

      properties.main = target.main && !target.main.match(/\{\{main\}\}/) ? target.main : 'dist/index.js';

      const deepPropeties = ['scripts', 'devDependencies', 'engines'];

      let extraBuild, buildOutput, specialTest;

      if (target.scripts) {
        if (target.scripts.test) {
          if (target.scripts.test.match(/rollup/)) {
            // TODO how to detect special rollup test config ?
            specialTest = target.scripts.test;
          }
        }

        if (target.scripts.build) {
          let m = target.scripts.build.match(/--output=([^\s]+)/);
          if (m) {
            buildOutput = m[1];
          }

          m = target.scripts.build.match(/\&\&\s*(.+)/);
          if (m) {
            extraBuild = m[1];
          }
        }
      }

      deepPropeties.forEach(p => {
        if (target[p] === undefined) {
          target[p] = {};
        }
        Object.assign(target[p], template[p]);
      });

      Object.keys(target.devDependencies).forEach(d => {
        if (template.devDependencies[d] === '-') {
          delete target.devDependencies[d];
        }
      });

      Object.keys(template).forEach(p => {
        if (p !== 'template') {
          if (target[p] === undefined) {
            target[p] = template[p];
          }
        }
      });

      if (buildOutput !== undefined) {
        target.scripts.build = target.scripts.build.replace(/--output=([^\s]+)/, `--output=${buildOutput}`);
      }

      if (specialTest !== undefined) {
        target.scripts.test = specialTest;
      }

      if (extraBuild !== undefined) {
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

      if (template.template && template.template.keywords) {
        Object.keys(template.template.keywords).forEach(r =>
          addKeyword(target, new RegExp(r), template.template.keywords[r])
        );
      }

      const rcj = this.context.files.get('rollup.config.js');

      let first;
      if (rcj) {
        first = rcj.mergedContent.then(c => {
          if (c) {
            if (!c.match(/rollup-plugin-node-resolve/)) {
              delete target.devDependencies['rollup-plugin-node-resolve'];
            }
            if (!c.match(/rollup-plugin-commonjs/)) {
              delete target.devDependencies['rollup-plugin-commonjs'];
            }
          }
        });
      } else {
        first = Promise.resolve();
      }

      return first.then(() => JSON.stringify(this.context.expand(target), undefined, 2));
    });
  }
}

function addKeyword(pkg, regex, keyword) {
  if (pkg.name.match(regex)) {
    if (!pkg.keywords.find(k => k === keyword)) {
      pkg.keywords.push(keyword);
    }
  }
}
