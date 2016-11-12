/* jslint node: true, esnext: true */

export default function (target, template, context, options = {}) {
  const tLines = context.expand(template).split(/\n/);
  const badges = tLines.slice(0, tLines.findIndex(l => l.length === 0));

  const lines = target.split(/\n/);
  const fel = lines.findIndex(l => l.length === 0);

  return badges.join('\n') + '\n' +
    lines.slice(fel).join('\n');
}
