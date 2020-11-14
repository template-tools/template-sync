import { Merger } from "../merger.mjs";
import { StringContentEntry } from "content-entry";

/**
 * injects badges into README.md
 */
export class Readme extends Merger {
  static get pattern() {
    return "**/README.md";
  }

  static get options() {
    return {
      ...super.options,
      badges: []
    };
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const original = await destinationEntry.getString();

    const badges = options.badges
      .sort((a, b) => (a.order > b.order ? 1 : a.order < b.order ? -1 : 0))
      .map(b => {
        const m = options;

        // TODO do not alter global properties use private layer here
        if (m.badges !== undefined) {
          Object.assign(context.properties, m.badges[b.name]);
        }

        const r = context.expand(`[![${b.name}](${b.icon})](${b.url})`);

        if (r.match(/\{\{/)) {
          return "";
        }
        return r;
      })
      .filter(b => b.length > 0);

    let body = original.split(/\n/);

    if (body.length === 0) {
      body = context.expand(template).split(/\n/);
    } else {
      body = body.filter(l => !l.match(/^\[\!\[.*\)$/));
    }
    const merged = badges.concat(body).join("\n");

    if (merged !== original) {
      yield {
        entries: [new StringContentEntry(destinationEntry.name, merged)],
        message: "docs(README): update from template"
      };
    }
  }
}
