import { Merger } from "../merger.mjs";
import { StringContentEntry } from "content-entry";

/**
 * injects badges into README.md
 */
export class Readme extends Merger {
  static get pattern() {
    return "**/README.md";
  }

  static get defaultOptions() {
    return {
      badges: []
    };
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
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

    return {
      entry: new StringContentEntry(destinationEntry.name,[...badges, ...body].join("\n")),
      message: "docs(README): update from template"
    };
  }
}
