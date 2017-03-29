/* jslint node: true, esnext: true */

import File from './File';

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend');

export default class Travis extends File {

  get merge() {
    return Promise.all([this.originalContent(), this.templateContent()])
      .then(([original, template]) => {
        const yml = yaml.safeLoad(original) || {};
        const tyml = yaml.safeLoad(this.context.expand(template));
        const before_script = yml.before_script;
        const email = yml.notifications ? yml.notifications.email : undefined;

        deepExtend(yml, tyml);

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
