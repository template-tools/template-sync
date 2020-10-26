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

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const originalTree = unified().use(markdown).parse(original);
    const templateTree = unified()
      .use(markdown)
      .parse(await sourceEntry.getString());

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

    return merged === original
      ? undefined
      : {
          message: actions2message(actions, options.messagePrefix, name),
          entry: new StringContentEntry(name, merged)
        };
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
  const children = [...a.children, ...b.children.filter(t => { a.children.find( ) } )];

  return { tpye: a.type, children };
}
