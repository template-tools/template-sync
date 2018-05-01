import { Context } from './context';

/**
 * @param {Branch} targetBranch
 * @param {Branch} templateBranch
 * @param {Object} options
 * @param {Object} defines
 * @return {Promise<PullRequest>}
 */
export async function npmTemplateSync(
  targetBranch,
  templateBranch,
  options,
  defines
) {
  options.spinner.text = targetBranch.fullCondensedName;
  const condensedName = targetBranch.repository.condensedName;

  try {
    const context = new Context(
      targetBranch,
      undefined,
      Object.assign(
        {
          github: { user: targetBranch.owner, repo: condensedName },
          npm: { name: condensedName, fullName: condensedName },
          name: condensedName,
          user: targetBranch.owner,
          'date.year': new Date().getFullYear(),
          'license.owner': targetBranch.owner
        },
        defines
      ),
      options
    );
  } catch (err) {
    options.spinner.fail(`${targetBranch.fullCondensedName}: ${err}`);
    throw err;
  }
}
