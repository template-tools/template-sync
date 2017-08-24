import File from './File';

const recast = require('recast');
//const types = require('ast-types');

export default class Rollup extends File {
  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: true
      }),
      this.templateContent({
        ignoreMissing: true
      })
    ]).then(([original, template]) => {
      if (template === '') {
        return {
          path: this.path,
          content: original,
          changed: false
        };
      }

      const templateAST = recast.parse(template);
      const ast = recast.parse(original);

      removeUseStrict(ast);

      const exp = exportDefaultDeclaration(ast);
      const templateExp = exportDefaultDeclaration(templateAST);

      for (const p of exp.properties) {
        switch (p.key.name) {
          case 'targets':
            p.key.name = 'output';
            p.value = templateExp.properties.find(
              x => x.key.name === 'output'
            ).value;
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
        exp.properties.push(
          templateExp.properties.find(x => x.key.name === 'output')
        );
      }

      const toBeRemoved = exp.properties.findIndex(
        x => x.key.name === 'format'
      );
      if (toBeRemoved >= 0) {
        exp.properties.splice(toBeRemoved, 1);
      }

      let pkg = importDeclaration(ast, 'pkg');
      if (!pkg) {
        pkg = importDeclaration(templateAST, 'pkg');

        //console.log(`pkg: ${JSON.stringify(pkg)}`);

        ast.program.body = [pkg, ...ast.program.body];
      }

      const content = recast.print(ast).code;

      //console.log(content);

      return {
        path: this.path,
        content,
        changed: content !== original,
        messages: ['chore(rollup): update from template']
      };
    });
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
