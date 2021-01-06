import unified from "unified";
import markdown from "remark-parse";
import stringify from "remark-stringify";
import { StringContentEntry } from "content-entry";
import { merge } from "hinted-tree-merger";
import { Merger } from "../merger.mjs";
import { actions2message, aggregateActions } from "../util.mjs";

export class Markdown extends Merger {
  static get pattern() {
    return "**/*.md";
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
    const originalTree = unified().use(markdown).parse(original);
    const templateTree = unified().use(markdown).parse(template);

    //console.log([...childTypes(originalTree, "heading")]);

    const actions = {};

    removePosition(originalTree);
    removePosition(templateTree);

    const mergedTree = merge(
      originalTree,
      templateTree,
      "",
      (action, hint) => aggregateActions(actions, action, hint),
      {
        "*.children": { key: "value" }
      }
    );
    // console.log(JSON.stringify(mergedTree, undefined, 2));

    const merged = unified().use(markdown).use(stringify).stringify(mergedTree);

    // console.log(merged);

    if (merged !== original) {
      const name = destinationEntry.name;

      yield {
        message: actions2message(actions, options.messagePrefix, name),
        entries: [new StringContentEntry(name, merged)]
      };
    }
  }
}

function removePosition(tree) {
  delete tree.position;
  if (tree.children) {
    tree.children.forEach(t => removePosition(t));
  }
}

function* childTypes(tree, type) {
  for (const c of tree.children.filter(c => c.type === type)) {
    yield c;
  }
}

function mergeHeadings(a, b) {
  const children = [
    ...a.children,
    ...b.children.filter(t => {
      a.children.find();
    })
  ];

  return { tpye: a.type, children };
}
