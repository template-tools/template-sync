import { Merger } from "../merger.mjs";
import { StringContentEntry } from "content-entry";

/**
 * Injects badges into README.md.
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
    const original = await destinationEntry.string;

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
        return r.replace(/&/g, "\\&");
      })
      .filter(b => b.length > 0);

    const body = original.split(/\n/);
    const merged = badges
      .concat(
        body.length === 0
          ? context.expand(template).split(/\n/)
          : body.filter(l => !l.match(/^\[\!\[.*\)$/))
      )
      .join("\n");

    if (merged !== original) {
      yield {
        entries: [new StringContentEntry(destinationEntry.name, merged)],
        message: "docs(README): update from template"
      };
    }
  }
}
