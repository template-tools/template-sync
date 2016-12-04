/* jslint node: true, esnext: true */
import File from './File';

export default class License extends File {
  get mergedContent() {
    return Promise.all([this.originalContent(), this.templateContent()]).then(contents => {
      const [original, template] = contents;
      const m = original.match(/opyright\s*\(c\)\s*(\d+)([,\-]\d+)*(\s*(,|by)\s*(.*))?/);

      const properties = this.context.properties;

      if (m) {
        const years = {};

        years[properties['date.year']] = properties['date.year'];
        years[m[1]] = m[1];

        if (m[2] !== undefined) {
          m[2].split(/\s*[,\-]\s*/).forEach(y => {
            if (y.length > 0) { 
              years[y] = y;
            }
          });
        }

        if (m[4] !== undefined) {
          properties['license.owner'] = m[5];
        }

        properties['date.year'] = Object.keys(years).join(',');
      }

      if (original !== '') {
        return original.replace(/opyright\s*\(c\)\s*(\d+)([,\-]\d+)/,
          `opyright (c) ${properties['date.year']}`);
      }

      return this.context.expand(template);
    });
  }
}
