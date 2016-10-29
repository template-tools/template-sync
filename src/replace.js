/* jslint node: true, esnext: true */


export default function (target, template, context, options = {}) {
  return context.expand(template);
}
