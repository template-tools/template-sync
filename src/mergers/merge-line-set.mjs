import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

function lines2set(content) {
  return new Set(content.split(/\r?\n/));
}

function set2lines(values, options) {
  const ignore = new Set(options.ignore);

  const nl = "\n";
  const r = Array.from(values)
    .filter(line => !ignore.has(line))
    .join(nl);
  return options.trailingNewline ? r + nl : r;
}

/**
 *
 */
export class MergeLineSet extends Merger {
  static get options() {
    return {
      ...super.options,
      trailingNewline: true,
      ignore: [""],
      mergeHints: {
        "*": {}
      }
    };
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const [original, template] = await Promise.all([
      destinationEntry.getString(),
      sourceEntry.getString()
    ]);
    const ignore = new Set(options.ignore);

    const actions = {};

    const merged = set2lines(
      merge(
        lines2set(original),
        [
          ...lines2set(options.expand ? context.expand(template) : template),
          ...[...ignore].map(p => `--delete-- ${p}`)
        ],
        "",
        (action, hint) => aggregateActions(actions, action, hint),
        options.mergeHints
      ),
      options
    );

    if (merged !== original) {
      const name = destinationEntry.name;
      yield {
        entries: [new StringContentEntry(name, merged)],
        message: actions2message(actions, options.messagePrefix, name)
      };
    }
  }
}
