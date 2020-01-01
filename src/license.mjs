import { File } from './file.mjs';

function yearsToString(years) {
  years = Array.from(years).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  
  /*
  for(let i = 0; i < years.length; i++) {
    years[i] === years[i + 1];
    if(i === years.length - 2) {
      return `${years[0]}-${years[i + 1]}`;
    }
  }
*/

  return years.join(',');
}

export class License extends File {
  static matchesFileName(name) {
    return name.match(/^LICENSE/);
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      messagePrefix: "chore(license): ",
    };
  }

  async mergeContent(context, original, template) {
    const messages = [];
    const year = context.evaluate('date.year');
    const years = new Set();

    const m = original.match(
      /opyright\s*\(c\)\s*(\d+)([,\-\d]+)*(\s*(,|by)\s*(.*))?/
    );

    if (m) {
      years.add(parseInt(m[1], 10));

      if (m[2] !== undefined) {
        m[2].split(/\s*[,\-]\s*/).forEach(y => {
          if (y.length > 0) {
            years.add(parseInt(y, 10));
          }
        });
      }

      if (m[4] !== undefined) {
        context.properties.license.owner = m[5];
      }

      if (!years.has(year)) {
        years.add(year);
        messages.push(`${this.options.messagePrefix}add year ${year}`);
      }
    }

    if (messages.length === 0) {
      messages.push('${this.options.messagePrefix}update');
    }

    if (original !== '') {
      const content = original.replace(
        /opyright\s*\(c\)\s*(\d+)([,\-\d])*/,
        `opyright (c) ${yearsToString(years)}`
      );

      return {
        changed: content !== original,
        messages,
        content
      };
    }

    return {
      content: context.expand(template),
      changed: true,
      messages: [`${this.options.messagePrefix}add LICENSE`]
    };
  }
}
