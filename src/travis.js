/* jslint node: true, esnext: true */

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend');

export default function (target, template, context, options = {}) {
  const yml = yaml.safeLoad(target) || {};
  const tyml = yaml.safeLoad(context.expand(template));

  const email = yml.notifications.email;

  deepExtend(yml, tyml);

  if (email) {
    yml.notifications.email = email;
  }

  return yaml.safeDump(yml);
}
