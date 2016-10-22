/* jslint node: true, esnext: true */

export default function (target, template, options = {}) {
  const tLines = template.split(/\n/);
  const badges = tLines.slice(tLines.findIndex(l => l.length === 0));

  const lines = target.split(/\n/);
  const fel = lines.findIndex(l => l.length === 0);

  return badges.map(line => line.replace(/\{\{name\}\}/g, () => options.targetRepo)).join('\n') +
    lines.slice(fel).join('\n');
}
