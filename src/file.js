/**
 * @param {string} path
 * @param {Object} options
 *
 * @property {string} path
 * @property {Object} options
 */
export class File {
  static matchesFileName(name) {
    return false;
  }

  static get defaultOptions() {
    return {};
  }

  constructor(path, options = {}) {
    Object.defineProperties(this, {
      path: {
        value: path
      },
      options: {
        value: Object.assign({}, this.defaultOptions, options)
      }
    });
  }

  get defaultOptions() {
    return this.constructor.defaultOptions;
  }

  get needsTemplate() {
    return true;
  }

  get needsOriginal() {
    return false;
  }

  optionalDevModules(modules) {
    return new Set();
  }

  usedDevModules(content) {
    return new Set();
  }

  /**
   * Deliver some key properties
   * @param {Branch} branch
   * @return {Object}
   */
  async properties(branch) {
    return {};
  }

  async mergeContent(context, original, template) {
    return {
      changed: false,
      content: original
    };
  }

  async targetContent(context, options) {
    return (await context.targetBranch.content(this.path, options)).content;
  }

  async content(context) {
    console.log(`*** X *** ${context.targetBranch} ${this.path}`);
    let c1;

    try {
      c1 = await context.targetBranch.content(this.path, {
        ignoreMissing: !this.needsOriginal
      });
    } catch (e) {
      console.log(e);
    }
    console.log(`*** Y ***`);

    const c2 = await context.templateBranch.content(this.path, {
      ignoreMissing: !this.needsTemplate
    });

    console.log(`*** Z ***`);

    return [c1.content, c2.content];
    /*
    return (await Promise.all([
      context.targetBranch.content(this.path, {
        ignoreMissing: !this.needsOriginal
      }),
      context.templateBranch.content(this.path, {
        ignoreMissing: !this.needsTemplate
      })
    ])).map(c => c.content);
    */
  }

  /**
   * @param {PreparedContect} context
   */
  async merge(context) {
    try {
      console.log(`*** a ***`);

      const [original, template] = await this.content(context);

      console.log(`*** b ***`);
      const result = this.mergeContent(context, original, template);
      console.log(`*** c ${result} ***`);

      if (result === undefined) {
        return {
          path: this.path,
          changed: false
        };
      }
      result.path = this.path;

      context.properties.path = this.path;
      result.messages = context.expand(result.messages);

      return result;
    } catch (err) {
      context.fail(
        `${
          context.targetBranch
            ? context.targetBranch.fullCondensedName
            : 'unknown'
        },${this.path}: ${err}`
      );
      return {
        path: this.path,
        changed: false
      };
    }
  }
}
