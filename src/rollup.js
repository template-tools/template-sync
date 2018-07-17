import { File } from './file';

const recast = require('recast');
const babylon = require('recast/parsers/babylon');

export class Rollup extends File {
  static matchesFileName(name) {
    return name.match(/rollup\.config\.js/);
  }

  get needsTemplate() {
    return false;
  }

  optionalDevModules(modules) {
    return new Set(
      Array.from(modules).filter(
        m => m.match(/rollup-plugin/) || m.match(/babel-preset/)
      )
    );
  }

  usedDevModules(content) {
    const modules = new Set();

    const ast = recast.parse(content, {
      parser: babylon
    });

    for (const decl of ast.program.body) {
      if (decl.type === 'ImportDeclaration') {
        modules.add(decl.source.value);
      }
    }

    return modules;
  }

  async mergeContent(context, original, template) {
    if (template === '') {
      return {
        content: original,
        changed: false
      };
    }
    if (original === '') {
      return {
        content: template,
        messages: ['chore(rollup): copy from template'],
        changed: true
      };
    }

    const messages = [];

    try {
      const recastOptions = {
        parser: babylon
      };

      const templateAST = recast.parse(template, recastOptions);
      const ast = recast.parse(original, recastOptions);

      removeUseStrict(ast);

      const exp = exportDefaultDeclaration(ast);
      const templateExp = exportDefaultDeclaration(templateAST);

      if (exp !== undefined && exp.properties !== undefined) {
        let output, dest;

        const banner = removePropertiesKey(exp.properties, 'banner');

        for (const p of exp.properties) {
          switch (p.key.name) {
            case 'targets':
              p.key.name = 'output';
              dest = p.value.elements[0].properties[0]; //.find(x => x.name === 'dest');
              p.value = templateExp.properties.find(
                x => x.key.name === 'output'
              ).value;
              output = p;
              break;
            case 'entry':
              p.key.name = 'input';
              p.value = templateExp.properties.find(
                x => x.key.name === 'input'
              ).value;
          }
        }

        if (exp.properties.find(x => x.key.name === 'input') === undefined) {
          exp.properties.push(
            templateExp.properties.find(x => x.key.name === 'input')
          );
        }

        if (
          exp.properties.find(x => x && x.key.name === 'output') === undefined
        ) {
          output = templateExp.properties.find(x => x.key.name === 'output');
          exp.properties.push(output);
        }

        if (output !== undefined) {
          if (banner !== undefined) {
            output.value.properties.push(banner);
          }

          if (dest !== undefined) {
            output.value.properties.find(x => x.key.name === 'file').value =
              dest.value;
          }
        }

        removePropertiesKey(exp.properties, 'format');
        removePropertiesKey(exp.properties, 'sourceMap');
        removePropertiesKey(exp.properties, 'dest');
      }

      const originalImports = importDeclarationsByLocalName(ast);
      const templateImports = importDeclarationsByLocalName(templateAST);

      const addedImports = [];
      
      templateImports.forEach((value, key) => {
        if (originalImports.get(key) === undefined) {
          ast.program.body = [value, ...ast.program.body];
          addedImport.push(key);
        }
      });

      if(addedImport.length > 0) {
        messages.push(`chore(rollup): import ${addedImports.join(',')}`);
      }

      const addedPlugins = [];
      const originalPlugins = pluginsFromExpression(exp);
      const templatePlugins = pluginsFromExpression(templateExp);

      templatePlugins.forEach(templatePlugin => {
        if (
          originalPlugins.find(
            op => op.callee.name === templatePlugin.callee.name
          ) === undefined
        ) {
          originalPlugins.push(templatePlugin);
          addedPlugins.push(templatePlugin.callee.name);
        }
      });

      if(addedPlugins.length > 0) {
        messages.push(`chore(rollup): add ${addedPlugins.join(',')}`);
      }

      const content = recast.print(ast).code;
      const changed = content !== original;

      if (changed && messages.length === 0) {
        messages.push('chore(rollup): update from template');
      }

      return {
        content,
        changed,
        messages
      };
    } catch (e) {
      console.log(e);
      context.warn(`unable to parse ${this.path}`);
      context.error(e);
    }

    return {
      content: original,
      changed: false
    };
  }
}

function removeUseStrict(ast) {
  for (const i in ast.program.body) {
    const decl = ast.program.body[i];
    if (
      decl.type === 'ExpressionStatement' &&
      decl.expression.type === 'Literal' &&
      decl.expression.value === 'use strict'
    ) {
      ast.program.body.splice(i, 1);
      return;
    }
  }
}

function importDeclarationsByLocalName(ast) {
  const declarations = new Map();

  for (const decl of ast.program.body) {
    if (decl.type === 'ImportDeclaration') {
      declarations.set(decl.specifiers[0].local.name, decl);
    }
  }

  return declarations;
}

function exportDefaultDeclaration(ast) {
  for (const decl of ast.program.body) {
    if (decl.type === 'ExportDefaultDeclaration') {
      return decl.declaration;
    }
  }

  return undefined;
}

function pluginsFromExpression(exp) {
  if (exp.properties !== undefined) {
    const plugins = exp.properties.find(
      p => p !== undefined && p.key.name === 'plugins'
    );

    if (plugins !== undefined) {
      return plugins.value.elements;
    }
  }

  return [];
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
