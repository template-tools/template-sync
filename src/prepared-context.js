import { Package } from './package';

/**
 * context prepared to execute one package
 */
export class PreparedContext {
  static async from(context, targetBranchName) {
    const pc = new PreparedContext(context, targetBranchName);
    await pc.initialize();
    return pc;
  }

  constructor(context, targetBranchName) {
    Object.defineProperties(this, {
      context: { value: context },
      targetBranchName: { value: targetBranchName }
    });
  }

  get logger() {
    return this.context.logger;
  }

  get provider() {
    return this.context.provider;
  }

  get templateBranchName() {
    return this.context.templateBranchName;
  }

  async initialize() {
    const context = this.context;

    const targetBranch = await context.provider.branch(this.targetBranchName);

    const pkg = new Package('package.json');
    const properties = {};

    Object.assign(properties, await pkg.properties(targetBranch));

    let templateBranch;

    if (context.templateBranchName === undefined) {
      try {
        templateBranch = await context.provider.branch(
          context.properties.templateRepo
        );
      } catch (e) {}

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    } else {
      templateBranch = await context.provider.branch(this.templateBranchName);
    }

    context.logger.debug(
      `Using ${templateBranch.provider.name} as template provider`
    );

    Object.defineProperties(this, {
      templateBranch: { value: templateBranch },
      targetBranch: { value: targetBranch },
      properties: { value: properties }
    });
  }
}
