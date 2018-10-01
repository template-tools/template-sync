import { File } from "./file";
import { templateOptions } from "./util";
import remark from "remark";
//import markdown from "remark-parse";
import inject from "mdast-util-inject";

function plugin(options) {
  return function transform(targetAst, file, next) {
    if (!inject(options.section, targetAst, options.toInject)) {
      return next(new Error(`Heading ${options.section} not found.`));
    }
    next();
  };
}

/**
 * injects badges into README.md
 */
export class Readme extends File {
  static matchesFileName(name) {
    return name.match(/README\./);
  }

  static get defaultOptions() {
    return {
      badges: []
    };
  }

  async mergeContent(context, original, template) {
    const [pkg, pkgTemplate] = await context.files
      .get("package.json")
      .content(context);

    const p = pkg.length === 0 ? {} : JSON.parse(pkg);
    const pTemplate = JSON.parse(pkgTemplate);

    const remarkOptions = {
      settings: { commonmark: true }
    };

    remark(remarkOptions).process(
      "[![Badge 1](http://domain.net/somewhere1.svg)](http://domain.net/somewhere1)",
      (err, f) => {
        console.log(f);
      }
    );

    remark(remarkOptions)
      .use(plugin, {
        section: "badges",
        toInject: {
          type: "paragraph",
          children: [
            {
              type: "image",
              url: "http://domain.net/somewhere1.svg",
              alt: "Badge 77"
            }
          ]
        }
        /*{
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [
                {
                  type: "link",
                  url: "http://domain.net/somewhere1",
                  children: [
                    {
                      type: "image",
                      title: null,
                      url: "http://domain.net/somewhere1.svg",
                      alt: "Badge 77"
                    }
                  ]
                }
              ]
            }
          ]
        }*/
      })
      .process(original);

    const badges = this.options.badges
      .map(b => {
        const m = templateOptions(p, this.constructor.name);

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

    const content = [...badges, ...body].join("\n");
    return {
      content,
      changed: content !== original,
      messages: ["docs(README): update from template"]
    };
  }
}
