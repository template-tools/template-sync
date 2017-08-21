import File from './File';

const recast = require('recast');

export default class Rollup extends File {
  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: this.ignoreMissing
      }),
      this.templateContent({
        ignoreMissing: this.ignoreMissing
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

      const content = recast.print(ast).code;

      return {
        path: this.path,
        content,
        changed: content !== original,
        messages: ['chore(rollup): update from template']
      };
    });
  }
}

function exportDefaultDeclaration(ast) {
  for (const decl of ast.program.body) {
    if (decl.type === 'ExportDefaultDeclaration') {
      return decl.declaration;
    }
  }

  return undefined;
}
