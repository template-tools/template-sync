import { File } from './file.mjs';

function getRanges(array) {
  const ranges = [];
  let rstart, rend;
  for (let i = 0; i < array.length; i++) {
    rstart = array[i];
    rend = rstart;
    while (array[i + 1] - array[i] === 1) {
      rend = array[i + 1]; // increment the index if the numbers sequential
      i++;
    }
    ranges.push(rstart == rend ? rstart+'' : rstart + '-' + rend);
  }
  return ranges;
}

function yearsToString(years) {  
  const ranges = getRanges(Array.from(years).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  return ranges.join(',');
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
      messages.push(`${this.options.messagePrefix}update`);
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
