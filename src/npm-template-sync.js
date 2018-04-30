import { Context } from './context';

/**
 * @param {RepositoryProvider} provider
 * @param {Branch} targetBranch
 * @param {Branch} templateBranch
 * @param {Object} options
 * @param {Object} defines
 * @return {Promise<PullRequest>}
 */
export async function npmTemplateSync(
  provider,
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

    const pkg = new Package('package.json');

    Object.assign(context.properties, await pkg.properties(context));

    if (templateBranch === undefined) {
      try {
        templateBranch = await provider.branch(context.properties.templateRepo);
      } catch (e) {}

      if (templateBranch === undefined) {
        throw new Error(
          `Unable to extract template repo url from ${targetBranch.name} ${
            pkg.path
          }`
        );
      }
    }

    context.templateBranch = templateBranch;

    context.logger.debug(
      `Using ${templateBranch.provider.name} as template provider`
    );

    let newTemplatePullRequest = false;
    let templatePRBranch = await templateBranch.repository.branch(
      'template-add-used-1'
    );

    const json = JSON.parse(
      await pkg.content(
        templatePRBranch ? templatePRBranch : context.templateBranch,
        pkg.path,
        { ignoreMissing: true }
      )
      //await pkg.templateContent(context, { ignoreMissing: true })
    );

    if (options.trackUsedByModule) {
      const name = targetBranch.fullCondensedName;

      if (json.template === undefined) {
        json.template = {};
      }
      if (!Array.isArray(json.template.usedBy)) {
        json.template.usedBy = [];
      }

      if (!json.template.usedBy.find(n => n === name)) {
        json.template.usedBy.push(name);
        json.template.usedBy = json.template.usedBy.sort();

        if (templatePRBranch === undefined) {
          templatePRBranch = await templateBranch.repository.createBranch(
            'template-add-used-1',
            context.templateBranch
          );
          newTemplatePullRequest = true;
        }

        await templatePRBranch.commit(`fix: add ${name}`, [
          {
            path: 'package.json',
            content: JSON.stringify(json, undefined, 2)
          }
        ]);

        if (newTemplatePullRequest) {
          const pullRequest = await templateBranch.createPullRequest(
            templatePRBranch,
            {
              title: `add ${name}`,
              body: `add tracking info for ${name}`
            }
          );
        }
      }
    }

    const files = await createFiles(
      context.templateBranch,
      json.template && json.template.files
    );

    files.forEach(f => context.addFile(f));

    context.logger.debug(context.files.values());

    const merges = (await Promise.all(
      files.map(f => f.saveMerge(context))
    )).filter(m => m !== undefined && m.changed);

    if (merges.length === 0) {
      context.spinner.succeed(
        `${targetBranch.fullCondensedName}: nothing changed`
      );
      return;
    }

    context.spinner.text = merges
      .map(m => `${targetBranch.fullCondensedName}: ${m.messages[0]}`)
      .join(',');

    if (context.dry) {
      context.spinner.succeed(`${targetBranch.fullCondensedName}: dry run`);
      return;
    }

    let newPullRequestRequired = false;
    const prBranchName = 'template-sync-1';
    let prBranch = (await targetBranch.repository.branches()).get(prBranchName);

    if (prBranch === undefined) {
      newPullRequestRequired = true;
      prBranch = await targetBranch.repository.createBranch(
        prBranchName,
        targetBranch
      );
    }

    const messages = merges.reduce((result, merge) => {
      merge.messages.forEach(m => result.push(m));
      return result;
    }, []);

    await prBranch.commit(messages.join('\n'), merges);

    if (newPullRequestRequired) {
      try {
        const pullRequest = await targetBranch.createPullRequest(prBranch, {
          title: `merge package from ${
            context.templateBranch.fullCondensedName
          }`,
          body: merges
            .map(
              m =>
                `${m.path}
---
- ${m.messages.join('\n- ')}
`
            )
            .join('\n')
        });
        context.spinner.succeed(
          `${targetBranch.fullCondensedName}: ${pullRequest.name}`
        );

        return pullRequest;
      } catch (err) {
        context.spinner.fail(err);
      }
    } else {
      const pullRequest = new targetBranch.provider.pullRequestClass(
        targetBranch.repository,
        'old'
      );

      context.spinner.succeed(
        `${targetBranch.fullCondensedName}: update PR ${pullRequest.name}`
      );
      return pullRequest;
    }
  } catch (err) {
    options.spinner.fail(`${targetBranch.fullCondensedName}: ${err}`);
    throw err;
  }
}
