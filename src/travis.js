/* jslint node: true, esnext: true */

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend');

export default function (target, template, context, options = {}) {
  const yml = yaml.safeLoad(target) || {};
  const tyml = yaml.safeLoad(context.expand(template));

  const before_script = yml.before_script;

  const email = yml.notifications.email;

  deepExtend(yml, tyml);

  if (email) {
    yml.notifications.email = email;
  }

  if (before_script) {
    before_script.forEach(s => {
      if (!yml.before_script.find(e => e === s)) {
        yml.before_script.push(s);
      }
    });
  }

  return yaml.safeDump(yml);
}
