/* jslint node: true, esnext: true */
import File from './File';

export default class Package extends File {

  async templateRepo() {
    const content = await this.originalContent();
    const pkg = JSON.parse(content);
    if (pkg.template !== undefined && pkg.template.repository !== undefined) {
      const m = pkg.template.repository.url.match(/github.com\/(.*)\.git$/);
      return m[1];
    }

    return undefined;
  }

  get merge() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const original = contents[0];
      const target = JSON.parse(contents[0]);
      const template = JSON.parse(contents[1]);
      const messages = [];

      const properties = this.context.properties;

      if (target.module !== undefined && !target.module.match(/\{\{module\}\}/)) {
        properties.module = target.module;
      }

      properties.main = target.main && !target.main.match(/\{\{main\}\}/) ? target.main : 'dist/index.js';

      const deepPropeties = ['scripts', 'devDependencies', 'engines'];

      let extraBuild, buildOutput;

      const keepScripts = {};

      if (target.scripts !== undefined) {
        if (target.scripts.test !== undefined) {
          if (target.scripts.test.match(/rollup/) || target.scripts.test.match(/istanbul.reporter.js/)) {
            // TODO how to detect special rollup test config ?
            keepScripts.test = target.scripts.test;
            keepScripts.pretest = target.scripts.pretest;
            keepScripts.cover = target.scripts.cover;
          }
        }

        [target.scripts.build, target.scripts.prepublish].filter(s => s !== undefined).forEach(script => {
          const ma = script.match(/--output=([^\s]+)/);
          if (ma) {
            buildOutput = ma[1];
          }

          const mb = script.match(/\&\&\s*(.+)/);
          if (mb) {
            extraBuild = mb[1];
          }
        });

        delete target.scripts.build;
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
          messages.push(`chore(dependencies): remove ${d}`);
        }
      });

      Object.keys(template).forEach(p => {
        if (p !== 'template') {
          if (target[p] === undefined) {
            target[p] = template[p];
          }
        }
      });

      if (target.scripts.prepublish) {
        if (buildOutput !== undefined) {
          target.scripts.prepublish = target.scripts.prepublish.replace(/--output=([^\s]+)/,
            `--output=${buildOutput}`);
        }
        if (extraBuild !== undefined) {
          target.scripts.prepublish += ` && ${extraBuild}`;
        }
      }

      target.scripts = Object.assign(target.scripts, keepScripts);

      if (target.module === '{{module}}') {
        delete target.module;
      }

      if (target.contributors !== undefined && target.author !== undefined && target.author.name !== undefined) {
        const m = target.author.name.match(/(^[^<]+)<([^>]+)>/);
        if (m !== undefined) {
          const name = String(m[1]).replace(/^\s+|\s+$/g, '');
          const email = m[2];

          if (target.contributors.find(c => c.name === name && c.email === email)) {
            delete target.author;
          }
        }
      }

      if (target.keywords !== undefined) {
        delete target.keywords['npm-package-template'];
      }

      if (template.template !== undefined && template.template.keywords !== undefined) {
        Object.keys(template.template.keywords).forEach(r =>
          addKeyword(target, new RegExp(r), template.template.keywords[r])
        );
      }

      target.template = {
        repository: {
          url: `https://github.com/${this.context.templateRepo}.git`
        }
      };

      const rcj = this.context.files.get('rollup.config.js');
      const first = (rcj !== undefined) ?
        rcj.merge.then(m => {
          if (m.content) {
            if (!m.content.match(/rollup-plugin-node-resolve/)) {
              delete target.devDependencies['rollup-plugin-node-resolve'];
            }
            if (!m.content.match(/rollup-plugin-commonjs/)) {
              delete target.devDependencies['rollup-plugin-commonjs'];
            }
          }
        }) : Promise.resolve();

      if (messages.length === 0) {
        messages.push('chore: update package.json from template');
      }

      return first.then(() => {
        const content = JSON.stringify(this.context.expand(target), undefined, 2);
        return {
          content: content,
          path: this.path,
          changed: original != content,
          message: messages.join('\n')
        };
      });
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
