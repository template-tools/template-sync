import File from './File';

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend'),
  semverDiff = require('semver-diff');

function diffVersion(a, b) {
  const aa = (String(a)).split(/\./).map(x => parseInt(x, 10));
  const bb = (String(b)).split(/\./).map(x => parseInt(x, 10));

  for (const i in aa) {
    if (i >= bb.length) {
      break;
    }

    if (aa[i] < bb[i]) {
      return -1;
    }
    if (aa[i] > bb[i]) {
      return 1;
    }
  }

  return 0;
}

function normalizeVersion(version) {
  version = String(version);

  const m = version.match(/^(\d+)(\.(\d+))?$/);

  if (m) {
    return m[3] ? m[1] + m[2] + '.0' : m[1] + '.0.0';
  }

  return version;
}

export default class Travis extends File {

  get merge() {
    return Promise.all([this.originalContent({
        ignoreMissing: true
      }), this.templateContent()])
      .then(([original, template]) => {
        const yml = yaml.safeLoad(original) || {};
        const tyml = yaml.safeLoad(this.context.expand(template));
        const before_script = yml.before_script;
        const email = yml.notifications ? yml.notifications.email : undefined;
        const formerNodeVersions = yml.node_js;
        const messages = [];

        let removeVersions = [];

        if (tyml.node_js) {
          removeVersions = tyml.node_js.filter(v => v < 0).map(v => -v);
          tyml.node_js = tyml.node_js.filter(v => v < 0 ? false : true);
        }

        deepExtend(yml, tyml);

        if (formerNodeVersions !== undefined) {
          formerNodeVersions.forEach(ov => {
            /*console.log(
              `${yml.node_js} <> ${ov} : ${yml.node_js.map(nv => { const x = semverDiff(ov, nv); return x ? x : 'null'} ).join(',')}`
            );
            */
            if (yml.node_js.find(nv => semverDiff(normalizeVersion(ov), normalizeVersion(nv)) === 'major')) {
              yml.node_js.push(ov);
            }
          });

          const toBeRemoved = yml.node_js.filter(v => removeVersions.find(rv => diffVersion(rv, v) === 0));
          if (toBeRemoved.length > 0) {
            messages.push(`chore(travis): remove node version(s) ${toBeRemoved.join(' ')}`);
          }

          yml.node_js = yml.node_js.filter(v =>
            removeVersions.find(rv => diffVersion(rv, v) === 0) ? false : true
          );
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

        if (messages.length === 0) {
          messages.push(`chore(travis): merge from template ${this.path}`);
        }

        return {
          path: this.path,
          content,
          changed: content !== original,
          messages
        };
      });
  }
}
