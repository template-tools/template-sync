/* jslint node: true, esnext: true */


export default function (target, template, context, options = {}) {
  const m = target.match(/opyright\s*\(c\)\s*(\d+)([,\-]\d+)*/);
  if (m) {
    const yearSet = new Set([parseInt(context.properties['date.year']), parseInt(m[1]), 1234]);

    if (m[2]) {
      m[2].split(/[,\-]/).forEach(y => yearSet.add(parseInt(y)));
    }

    const years = Array.from(yearSet.entries);

    console.log(years);

    //context.properties['date.year'] = years.join(',');
  }

  return context.expand(template);
}
