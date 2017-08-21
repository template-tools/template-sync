import File from './File';

const recast = require('recast');

export default class Rollup extends File {
  get merge() {
    return Promise.all([
      this.originalContent({
        ignoreMissing: true
      }),
      this.templateContent({
        ignoreMissing: true
      })
    ]).then(([original, templateRaw]) => {
      const ast = recast.parse(original);

      for (const decl of ast.program.body) {
        if (decl.type === 'ExportDefaultDeclaration') {
          const exp = decl.declaration;

          for (const p of exp.properties) {
            switch (p.key.name) {
              case 'targets':
                p.key.name = 'output';
                p.key.value = { file: p.value.value };
                break;
              case 'entry':
                p.key.name = 'input';
            }
          }
          console.log(exp.properties);
          break;
        }
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
