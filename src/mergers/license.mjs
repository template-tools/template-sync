import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

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
    ranges.push(rstart == rend ? rstart + "" : rstart + "-" + rend);
  }
  return ranges;
}

function yearsToString(years) {
  const ranges = getRanges(
    Array.from(years).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  );
  return ranges.join(",");
}

export function stringToIntegers(str) {
  const years = new Set();

  while (true) {
    let m = str.match(/^(\d+)(\s*,\s*)?(.*)/);

    if (m) {
      const low = parseInt(m[1], 10);
      years.add(low);

      str = m[3];
      m = str.match(/^-(\d+)(.*)/);

      if (m && m[1]) {
        str = m[2];
        const high = parseInt(m[1], 10);
        for (let y = low; y <= high; y++) {
          years.add(y);
        }
      }
    } else {
      break;
    }
  }
  return years;
}

export class License extends Merger {
  static get pattern() {
    return "**/LICENSE*";
  }

  static get options() {
    return {
      ...super.options,
      messagePrefix: "chore(license): "
    };
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    let mergedYears = new Set([context.evaluate("date.year")]);
    let originalYears = new Set();
    const [original, template] = await Promise.all([
      destinationEntry.string,
      sourceEntry.string
    ]);

    const m = original.match(
      /opyright\s*\(c\)\s*((\d+)([,\-\d]+)*)(\s*(,|by)\s*(.*))?/i
    );

    if (m) {
      originalYears = stringToIntegers(m[1]);
      mergedYears = originalYears.union(mergedYears);

      if (m[5] !== undefined) {
        context.properties.license.owner = m[6];
      }
    }

    context.properties.license.years = yearsToString(mergedYears);
    const merged = context.expand(template);

    if (merged !== original) {
      const addedYears = mergedYears.difference(originalYears);
      yield {
        entries: [new StringContentEntry(destinationEntry.name, merged)],
        message: originalYears.size !== 0
          ? `${options.messagePrefix}add year ${[...addedYears]}`
          : `${options.messagePrefix}update from template`
      };
    }
  }
}
