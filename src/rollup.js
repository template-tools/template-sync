import File from './file';

const recast = require('recast');
//const types = require('ast-types');

export default class Rollup extends File {
  get needsTemplate() {
    return false;
  }

  usedModules(content) {
    const modules = new Set();

    const ast = recast.parse(content);

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
        path: this.path,
        content: original,
        changed: false
      };
    }
    if (original === '') {
      return {
        path: this.path,
        content: template,
        messages: ['chore(rollup): copy from template'],
        changed: true
      };
    }

    const templateAST = recast.parse(template);
    const ast = recast.parse(original);

    removeUseStrict(ast);

    const exp = exportDefaultDeclaration(ast);
    const templateExp = exportDefaultDeclaration(templateAST);

    const banner = removePropertiesKey(exp.properties, 'banner');
    let output, dest;

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

    if (exp.properties.find(x => x.key.name === 'output') === undefined) {
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

    let pkg = importDeclaration(ast, 'pkg');
    if (pkg === undefined) {
      pkg = importDeclaration(templateAST, 'pkg');

      ast.program.body = [pkg, ...ast.program.body];
    }

    const content = recast.print(ast).code;

    return {
      path: this.path,
      content,
      changed: content !== original,
      messages: ['chore(rollup): update from template']
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

function importDeclaration(ast, localName) {
  for (const decl of ast.program.body) {
    if (
      decl.type === 'ImportDeclaration' &&
      decl.specifiers[0].local.name === localName
    ) {
      return decl;
    }
  }

  return undefined;
}

function exportDefaultDeclaration(ast) {
  for (const decl of ast.program.body) {
    if (decl.type === 'ExportDefaultDeclaration') {
      return decl.declaration;
    }
  }

  return undefined;
}

function removePropertiesKey(properties, name) {
  const toBeRemoved = properties.findIndex(x => x.key.name === name);
  if (toBeRemoved >= 0) {
    const slot = properties[toBeRemoved];
    properties.splice(toBeRemoved, 1);
    return slot;
  }

  return undefined;
}
