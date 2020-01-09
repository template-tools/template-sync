import unified from "unified";
import markdown from "remark-parse";
import rehype2remark from "rehype-remark";
import stringify from "remark-stringify";
import { File } from "./file.mjs";
import { actions2messages } from "./util.mjs";

export class Markdown extends File {
  static matchesFileName(name) {
    return name.match(/\.md$/);
  }

  async mergeContent(context, original, template) {
    const actions = {};

    const processor = unified()
      .use(markdown)
      .use(rehype2remark)
      .use(stringify); 

    let content;

    processor.process(original, function(err, file) {
      content = file.contents;
    });

    return {
      content,
      changed: content !== original,
      messages: actions2messages(actions, this.options.messagePrefix, this.name)
    };
  }
}
