import { parse, print } from "recast";
import parser from "recast/parsers/babel.js";
import transform from "@babel/core/lib/transform.js";
import { StringContentEntry } from "content-entry";
import { Merger } from "../merger.mjs";

export class Rollup extends Merger {
  static get pattern() {
    return "**/rollup.config.*js";
  }

  static get options() {
    return {
      ...super.options,
      messagePrefix: "chore(rollup): ",
      optionalDevDependencies: [
        /\@rollup\/plugin\-.*/,
        /rollup\-plugin\-.*/,
        /babel-preset.*/,
        "postcss",
        "builtin-modules"
      ]
    };
  }

  static async usedDevDependencies(into, entry) {
    const content = await entry.getString();
    const ast = parse(content, {
      parser: {
        parse: source =>
          transform.transform(source, {
            code: false,
            ast: true,
            sourceMap: false
          }).ast
      }
    });

    for (const decl of ast.program.body) {
      if (decl.type === "ImportDeclaration") {
        into.add(decl.source.value);
      }
    }

    return into;
  }

  static async *commits(
    context,
    destinationEntry,
    sourceEntry,
    options = this.options
  ) {
    const name = destinationEntry.name;
    const templateContent = await sourceEntry.getString();

    if (await destinationEntry.isEmpty()) {
      yield {
        message: `${options.messagePrefix}add missing ${destinationEntry.name} from template`,
        entries: [new StringContentEntry(
          destinationEntry.name,
          options.expand ? context.expand(templateContent) : templateContent
        )]
      };
      return;
    }

    const original = await destinationEntry.getString();

    let messages = [];

    const templateAST = parse(templateContent, parser);
    const ast = parse(original, parser);

    removeUseStrict(ast);

    const exp = exportDefaultDeclaration(ast);
    const templateExp = exportDefaultDeclaration(templateAST);

    if (
      exp !== undefined &&
      exp.properties !== undefined &&
      templateExp !== undefined
    ) {
      let output, dest;

      const banner = removePropertiesKey(exp.properties, "banner");

      for (const p of exp.properties) {
        switch (p.key.name) {
          case "targets":
            dest = p.value.elements[0].properties[0]; //.find(x => x.name === 'dest');
            const op = findProperty(templateExp.properties, "output");
            if (op !== undefined) {
              p.key.name = "output";
              p.value = op.value;
              output = p;
            }
            break;
          case "entry":
            const ip = findProperty(templateExp.properties, "input");
            if (ip !== undefined) {
              p.key.name = "input";
              p.value = ip.value;
            }
        }
      }

      if (findProperty(exp.properties, "input") === undefined) {
        exp.properties.push(findProperty(templateExp.properties, "input"));
      }

      const originalOutput = findProperty(exp.properties, "output");
      const templateOutput = findProperty(templateExp.properties, "output");

      if (originalOutput === undefined) {
        exp.properties.push(templateOutput);
      } else {
        mergeKeys(
          templateOutput,
          originalOutput,
          [
            "format",
            "file",
            "dir",
            "name",
            "globals",
            "paths",
            "banner",
            "footer",
            "intro",
            "outro",
            "sourcemap",
            "sourcemapFile",
            "interop",
            "extend",
            "exports",
            "amd",
            "indent",
            "strict",
            "freeze",
            "legacy",
            "namespaceToStringTag"
          ],
          messages,
          options
        );

        if (output !== undefined) {
          if (banner !== undefined) {
            output.value.properties.push(banner);
          }

          if (dest !== undefined) {
            const file = findProperty(output.value.properties, "file");
            if (file !== undefined) {
              file.value = dest.value;
            }
          }
        }

        removePropertiesKey(exp.properties, "format");
        removePropertiesKey(exp.properties, "sourceMap");
        removePropertiesKey(exp.properties, "dest");
      }
    }
    const originalImports = importDeclarationsByLocalName(ast);
    const templateImports = importDeclarationsByLocalName(templateAST);

    const addedImports = [];

    templateImports.forEach((value, key) => {
      if (originalImports.get(key) === undefined) {
        ast.program.body = [value, ...ast.program.body];
        addedImports.push(key);
      }
    });

    if (addedImports.length > 0) {
      messages.push(`${options.messagePrefix}import ${addedImports.join(",")}`);
    }

    const addedPlugins = [];
    const originalPlugins = pluginsFromExpression(exp);
    const templatePlugins = pluginsFromExpression(templateExp);

    templatePlugins.forEach(templatePlugin => {
      if (
        templatePlugin &&
        templatePlugin.callee !== undefined &&
        originalPlugins.find(
          op =>
            op &&
            op.callee !== undefined &&
            op.callee.name === templatePlugin.callee.name
        ) === undefined
      ) {
        originalPlugins.push(templatePlugin);
        addedPlugins.push(templatePlugin.callee.name);
      }
    });
    if (addedPlugins.length > 0) {
      messages.push(`${options.messagePrefix}add ${addedPlugins.join(",")}`);
    }

    const merged = print(ast).code;

    if (original !== merged) {
      yield {
        entries: [new StringContentEntry(name, merged)],
        message: messages.join("\n")
      };
    }
  }
}

function removeUseStrict(ast) {
  for (const i in ast.program.body) {
    const decl = ast.program.body[i];
    if (
      decl.type === "ExpressionStatement" &&
      decl.expression.type === "Literal" &&
      decl.expression.value === "use strict"
    ) {
      ast.program.body.splice(i, 1);
      return;
    }
  }
}

function importDeclarationsByLocalName(ast) {
  const declarations = new Map();

  for (const decl of ast.program.body) {
    if (decl.type === "ImportDeclaration") {
      declarations.set(decl.specifiers[0].local.name, decl);
    }
  }

  return declarations;
}

function exportDefaultDeclaration(ast) {
  for (const decl of ast.program.body) {
    if (decl.type === "ExportDefaultDeclaration") {
      return decl.declaration;
    }
  }

  return undefined;
}

function pluginsFromExpression(exp) {
  if (exp !== undefined && exp.properties !== undefined) {
    const plugins = exp.properties.find(
      p => p !== undefined && p.key.name === "plugins"
    );

    if (plugins !== undefined) {
      return plugins.value.elements;
    }
  }

  return [];
}

function findProperty(properties, name) {
  if (properties !== undefined) {
    const prop = properties.find(
      prop => prop !== undefined && prop.key.name === name
    );

    return prop;
  }
  return undefined;
}

function removePropertiesKey(properties, name) {
  if (properties === undefined) {
    return undefined;
  }

  const toBeRemoved = properties.findIndex(x => x && x.key.name === name);
  if (toBeRemoved >= 0) {
    const slot = properties[toBeRemoved];
    properties.splice(toBeRemoved, 1);
    return slot;
  }

  return undefined;
}

function mergeKeys(source, dest, knownKeys, messages, options) {
  const mergedKeys = [];

  if (source !== undefined) {
    knownKeys.forEach(key => {
      const destProp = findProperty(dest.value.properties, key);
      const sourceProp = findProperty(source.value.properties, key);
      if (sourceProp !== undefined && destProp === undefined) {
        mergedKeys.push(key);
        dest.value.properties.push(sourceProp);
      }
    });
  }

  if (mergedKeys.length > 0) {
    messages.push(
      `${options.messagePrefix}add to output ${mergedKeys.join(",")}`
    );
  }

  return mergedKeys;
}
