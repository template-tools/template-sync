/* jslint node: true, esnext: true */

import File from './File';

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend'),
  semverDiff = require('semver-diff');

export default class Travis extends File {

  get merge() {
    return Promise.all([this.originalContent(), this.templateContent()])
      .then(([original, template]) => {
        const yml = yaml.safeLoad(original) || {};
        const tyml = yaml.safeLoad(this.context.expand(template));
        const before_script = yml.before_script;
        const email = yml.notifications ? yml.notifications.email : undefined;
        const formerNodeVersions = yml.node_js;

        deepExtend(yml, tyml);

        if (formerNodeVersions !== undefined) {
          formerNodeVersions.forEach(ov => {
            /*        console.log(
                      `${yml.node_js} <> ${ov} : ${yml.node_js.map(nv => { const x = semverDiff(ov, nv); return x ? x : 'null'} ).join(',')}`
                    );*/
            if (yml.node_js.find(nv => semverDiff(ov, nv) === 'major')) {
              yml.node_js.push(ov);
            }
          });
        }

        if (email !== undefined) {
          yml.notifications.email = email;
        }

        if (before_script !== undefined) {
          before_script.forEach(s => {
            if (!yml.before_script.find(e => e === s)) {
              yml.before_script.push(s);
            }
          });
        }

        const content = yaml.safeDump(yml, {
          lineWidth: 128
        });

        return {
          path: this.path,
          content: content,
          changed: content !== original,
          message: `chore(travis): merge from template ${this.path}`
        };
      });
  }
}
