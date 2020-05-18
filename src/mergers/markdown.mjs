import unified from "unified";
import markdown from "remark-parse";
import stringify from "remark-stringify";
import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";
import { actions2message } from "../util.mjs";

export class Markdown extends Merger {
  static get pattern() {
    return "**/*.md";
  }

  static async merge(
    context,
    destinationEntry,
    sourceEntry,
    options = this.defaultOptions
  ) {
    const name = destinationEntry.name;
    const original = await destinationEntry.getString();
    const originalTree = unified().use(markdown).parse(original);
    const templateTree = unified()
      .use(markdown)
      .parse(await sourceEntry.getString());

    //console.log([...childTypes(templateTree, "heading")]);

    const actions = {};
    const headings = {};

    for (const h of childTypes(originalTree, "heading")) {
      headings[h.children[0].value] = h;
    }

    // add headings from template
    for (const h of childTypes(templateTree, "heading")) {
      if(headings[h.children[0].value] === undefined) {
        originalTree.children.push(h);
      }
    }

    //  originalTree.children.push(...childTypes(templateTree, "heading"));

    const merged = unified()
      .use(markdown)
      .use(stringify)
      .stringify(originalTree);

    return merged === original
      ? undefined
      : {
          message: actions2message(actions, options.messagePrefix, name),
          entry: new StringContentEntry(name, merged)
        };
  }
}

function* childTypes(tree, type) {
  for (const c of tree.children.filter(c => c.type === type)) {
    yield c;
  }
}
