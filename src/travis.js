/* jslint node: true, esnext: true */

const yaml = require('js-yaml'),
  deepExtend = require('deep-extend');

export default function (target, template, context, options = {}) {
  const yml = yaml.safeLoad(target) || {};
  const tyml = yaml.safeLoad(context.expand(template));

  deepExtend(yml, tyml);

  return yaml.safeDump(yml);
}
