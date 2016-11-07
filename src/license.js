/* jslint node: true, esnext: true */


export default function (target, template, context, options = {}) {
  const m = target.match(/opyright\s*\(c\)\s*(\d+)([,\-]\d+)*(\s*(,|by)\s*(.*))?/);

  if (m) {
    const years = {};

    years[context.properties['date.year']] = context.properties['date.year'];
    years[m[1]] = m[1];

    if (m[2] !== undefined) {
      m[2].split(/\s*[,\-]\s*/).forEach(y => years[y] = y);
    }

    if (m[4] !== undefined) {
      context.properties['license.owner'] = m[5];
    }

    context.properties['date.year'] = Object.keys(years).join(',');
  }

  return context.expand(template);
}
