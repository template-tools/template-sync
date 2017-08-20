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

      const exp = ast.program.body[2].declaration.properties;
      console.log(exp);

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
