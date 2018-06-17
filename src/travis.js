import { File } from './file';
import { diffVersion } from './util';
import deepExtend from 'deep-extend';

const yaml = require('js-yaml') /*,
  deepExtend = require('deep-extend')*/;

function difference(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}

export class Travis extends File {
  static matchesFileName(name) {
    return name === '.travis.yml';
  }

  async mergeContent(context, original, template) {
    const yml = yaml.safeLoad(original, { schema: yaml.FAILSAFE_SCHEMA }) || {};
    const tyml = yaml.safeLoad(context.expand(template), {
      schema: yaml.FAILSAFE_SCHEMA
    });
    const before_script = yml.before_script;
    const email = yml.notifications ? yml.notifications.email : undefined;
    const messages = [];

    const oldVersions = new Set(
      yml.node_js ? [...yml.node_js.map(s => String(s))] : []
    );
    const templateVersions = new Set(
      tyml.node_js ? [...tyml.node_js.map(s => String(s))] : []
    );
    const versions = new Set([...oldVersions, ...templateVersions]);
    const newVersions = new Set(versions);

    versions.forEach(v => {
      if (v.startsWith('-')) {
        const d = v.replace(/^\-\s*/, '');

        versions.forEach(v => {
          const x = v.replace(/^\-\s*/, '');
          //console.log(`${d}<>${v} => ${diffVersion(d, x) === 0 || x != v}`);
          if (diffVersion(d, x) === 0 || x != v) {
            if (templateVersions.has(x)) {
              return;
            }

            newVersions.delete(x);
            newVersions.delete(v);
          }
        });
      }
    });

    const r = difference(oldVersions, newVersions);
    if (r.size > 0) {
      messages.push(
        `chore(travis): remove node versions ${Array.from(new Set(r)).sort()}`
      );
    }

    const a = difference(newVersions, oldVersions);
    if (a.size > 0) {
      messages.push(
        `chore(travis): add node versions ${Array.from(new Set(a)).sort()}`
      );
    }

    deepExtend(yml, tyml);

    if (newVersions.size > 0) {
      yml.node_js = Array.from(new Set(newVersions))
        .sort()
        .map(s => (String(parseFloat(s)) == s ? parseFloat(s) : s));
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

    if (yml.before_script) {
      yml.before_script = yml.before_script.filter(
        s =>
          !tyml.before_script.find(e => e === `-${s}`) && s.indexOf('-') !== 0
      );
    }

    const content = yaml.safeDump(yml, {
      lineWidth: 128
    });

    if (messages.length === 0) {
      messages.push(`chore(travis): merge from template ${this.path}`);
    }

    return {
      content,
      changed: content !== original,
      messages
    };
  }
}
