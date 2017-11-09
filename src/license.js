import File from './file';

export default class License extends File {
  static matchesFileName(name) {
    return name.match(/^LICENSE/);
  }

  async mergeContent(context, original, template) {
    const properties = context.properties;
    const messages = [];

    const m = original.match(
      /opyright\s*\(c\)\s*(\d+)([,\-\d]+)*(\s*(,|by)\s*(.*))?/
    );

    if (m) {
      const years = new Set();
      years.add(parseInt(m[1], 10));

      if (m[2] !== undefined) {
        m[2].split(/\s*[,\-]\s*/).forEach(y => {
          if (y.length > 0) {
            years.add(parseInt(y, 10));
          }
        });
      }

      if (m[4] !== undefined) {
        properties['license.owner'] = m[5];
      }

      if (!years.has(properties['date.year'])) {
        years.add(properties['date.year']);
        messages.push(
          `chore(license): add current year ${properties['date.year']}`
        );
      }

      properties['date.year'] = Array.from(years)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .join(',');
    }

    if (messages.length === 0) {
      messages.push('chore(license): update');
    }

    if (original !== '') {
      const content = original.replace(
        /opyright\s*\(c\)\s*(\d+)([,\-\d])*/,
        `opyright (c) ${properties['date.year']}`
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
      messages: [`chore(license): add LICENSE`]
    };
  }
}
