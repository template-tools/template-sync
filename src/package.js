import File from './file';

function moduleNames(object) {
  if (object === undefined) return new Set();

  const modules = new Set();

  Object.keys(object).forEach(k => {
    const v = object[k];
    if (typeof v === 'string') {
      modules.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(e => {
        if (typeof e === 'string') {
          modules.add(e);
        }
      });
    }
  });

  return modules;
}

/**
 * order in which json keys are written
 */
const sortedKeys = [
  'name',
  'version',
  'main',
  'module',
  'description',
  'keywords',
  'author',
  'contributors',
  'license',
  'bin',
  'scripts',
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'engines',
  'repository',
  'bugs',
  'homepage',
  'release',
  'ava',
  'nyc',
  'xo',
  'template'
];

export default class Package extends File {
  static matchesFileName(name) {
    return name.match(/^package\.json$/);
  }

  optionalDevModules(modules = new Set()) {
    return new Set(['cracks', 'dont-crack'].filter(m => modules.has(m)));
  }

  async usedDevModules(content) {
    content = await content;

    const pkg = content.length === 0 ? {} : JSON.parse(content);

    return moduleNames(pkg.release);
  }

  async templateRepo(context) {
    const content = await this.originalContent(context, {
      ignoreMissing: true
    });
    const pkg = JSON.parse(content);
    if (pkg.template !== undefined && pkg.template.repository !== undefined) {
      const m = pkg.template.repository.url.match(/github.com\/(.*)\.git$/);
      return m[1];
    }

    return undefined;
  }

  async mergeContent(context, original, templateContent) {
    const originalLastChar = original[original.length - 1];

    let target =
      original === undefined || original === '' ? {} : JSON.parse(original);
    const template = JSON.parse(templateContent);
    let messages = [];
    const properties = context.properties;

    if (target.name === undefined || target.name === '') {
      const m = context.targetRepo.name.match(/^([^\/]+)\/(.*)/);
      target.name = m ? m[2] : context.targetRepo.name;
    }

    if (target.module !== undefined && !target.module.match(/\{\{module\}\}/)) {
      properties.module = target.module;
    }

    properties.main =
      target.main && !target.main.match(/\{\{main\}\}/)
        ? target.main
        : 'dist/index.js';

    const githubURL = `git+https://github.com/${properties.user}/${
      target.name
    }.git`;
    const githubURLAlternative = `git+https://github.com/${
      properties.user
    }/node-${target.name}.git`;

    let repoName = target.name;

    if (
      target.repository === undefined ||
      (target.repository.url !== githubURL &&
        target.repository.url !== githubURLAlternative)
    ) {
      target.repository = {
        type: 'git',
        url: githubURL
      };
      messages.push(`chore(package): correct github url`);
    }

    if (
      target.repository !== undefined &&
      githubURLAlternative === target.repository.url
    ) {
      repoName = `node-${target.name}`;
    }

    const bugsURL = `https://github.com/${properties.user}/${repoName}/issues`;

    if (target.bugs === undefined || target.bugs.url !== bugsURL) {
      target.bugs = {
        url: bugsURL
      };
      messages.push(`chore(package): correct bugs url`);
    }

    const homepageURL = `https://github.com/${
      properties.user
    }/${repoName}#readme`;

    if (target.homepage === undefined || target.homepage !== homepageURL) {
      target.homepage = homepageURL;
      messages.push(`chore(package): correct hompage url`);
    }

    let buildOutput;
    const extraBuilds = {};

    if (target.scripts !== undefined) {
      Object.keys(target.scripts).forEach(key => {
        const script = target.scripts[key];
        const ma = script.match(/--output=([^\s]+)/);
        if (ma) {
          buildOutput = ma[1];
        }

        if (template.scripts !== undefined && key !== 'semantic-release') {
          const templateScript = template.scripts[key];
          if (templateScript !== undefined) {
            const mb = script.match(/&&\s*(.+)$/);
            if (mb && !templateScript.includes(mb[1])) {
              extraBuilds[key] = mb[1];
            }
          }
        }
      });
    }

    const usedDevModules = await context.usedDevModules();

    context.logger.debug(
      `usedDevModules: ${Array.from(usedDevModules).join(',')}`
    );

    const optionalDevModules = context.optionalDevModules(usedDevModules);

    context.logger.debug(
      `optionalDevModules: ${Array.from(optionalDevModules).join(',')}`
    );

    const deepProperties = {
      devDependencies: {},
      dependencies: {},
      peerDependencies: {},
      optionalDependencies: {},
      scripts: {},
      engines: {}
    };

    Object.keys(deepProperties).forEach(category => {
      if (template[category] !== undefined) {
        Object.keys(template[category]).forEach(d => {
          if (template[category][d] === '-') {
            if (
              target[category] !== undefined &&
              target[category][d] !== undefined
            ) {
              messages.push(
                `chore(${category}): remove ${d}@${target[category][d]}`
              );
              delete target[category][d];
            }
          } else {
            const tp = context.expand(template[category][d]);

            if (
              category === 'devDependencies' &&
              target.dependencies !== undefined &&
              target.dependencies[d] === tp
            ) {
              // do not include dev dependency if regular dependency is already present
            } else {
              if (
                target[category] !== undefined &&
                tp !== target[category][d]
              ) {
                messages.push(
                  target[category][d] === undefined
                    ? `chore(${category}): add ${d}@${tp} from template`
                    : `chore(${category}): update ${d}@${tp} from template`
                );
                target[category][d] = tp;
              }
            }
          }
        });
      }
    });

    Object.keys(template).forEach(p => {
      if (p !== 'template') {
        if (target[p] === undefined) {
          target[p] = template[p];
        }
      }
    });

    if (target.scripts !== undefined && target.scripts.prepare) {
      if (buildOutput !== undefined) {
        target.scripts.prepare = target.scripts.prepare.replace(
          /--output=([^\s]+)/,
          `--output=${buildOutput}`
        );
      }
    }

    Object.keys(extraBuilds).forEach(key => {
      target.scripts[key] += ` && ${extraBuilds[key]}`;
    });

    if (target.module === '{{module}}') {
      delete target.module;
    }

    if (
      target.contributors !== undefined &&
      target.author !== undefined &&
      target.author.name !== undefined
    ) {
      const m = target.author.name.match(/(^[^<]+)<([^>]+)>/);
      if (m !== undefined) {
        const name = String(m[1]).replace(/^\s+|\s+$/g, '');
        const email = m[2];

        if (
          target.contributors.find(c => c.name === name && c.email === email)
        ) {
          delete target.author;
        }
      }
    }

    if (
      target.template === undefined ||
      target.template.repository === undefined ||
      target.template.repository.url !==
        `https://github.com/${context.templateRepo.name}.git`
    ) {
      messages.push('chore(package): set template repo');

      target.template = {
        repository: {
          url: `https://github.com/${context.templateRepo.name}.git`
        }
      };
    }

    const toBeDeletedModules =
      target.devDependencies === undefined
        ? []
        : Array.from(
            context.optionalDevModules(
              new Set(Object.keys(target.devDependencies))
            )
          ).filter(m => !usedDevModules.has(m));

    toBeDeletedModules.forEach(d => {
      messages = messages.filter(
        m => !m.startsWith(`chore(devDependencies): add ${d}@`)
      );
      delete target.devDependencies[d];
    });

    target = deleter(target, template, messages, []);

    if (target.keywords !== undefined) {
      delete target.keywords['npm-package-template'];
    }

    if (
      template.template !== undefined &&
      template.template.keywords !== undefined
    ) {
      Object.keys(template.template.keywords).forEach(r =>
        addKeyword(
          target,
          new RegExp(r),
          template.template.keywords[r],
          messages
        )
      );
    }

    removeKeyword(target, ['null', null, undefined], messages);

    if (messages.length === 0) {
      messages.push('chore: update package.json from template');
    }

    target = context.expand(target);
    const sortedTarget = {};

    sortedKeys.forEach(key => {
      if (target[key] !== undefined) {
        sortedTarget[key] = target[key];
      }
    });

    Object.keys(target).forEach(key => {
      if (sortedTarget[key] === undefined) {
        sortedTarget[key] = target[key];
      }
    });

    let newContent = JSON.stringify(sortedTarget, undefined, 2);
    const lastChar = newContent[newContent.length - 1];

    // keep trailing newline
    if (originalLastChar === '\n' && lastChar === '}') {
      newContent += '\n';
    }

    return {
      content: newContent,
      messages,
      changed: original !== newContent
    };
  }
}

function deleter(object, reference, messages, path) {
  if (
    typeof object === 'string' ||
    object instanceof String ||
    object === true ||
    object === false ||
    object === undefined ||
    object === null ||
    typeof object === 'number' ||
    object instanceof Number
  ) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map((e, i) => {
      path.push(i);
      const n = deleter(
        object[i],
        Array.isArray(reference) ? reference[i] : undefined,
        messages,
        path
      );
      path.pop();
      return n;
    });
  }

  if (reference) {
    Object.keys(reference).forEach(key => {
      path.push(key);

      if (reference[key] === '--delete--' && object[key] !== undefined) {
        if (object[key] !== '--delete--') {
          messages.push(`chore(npm): delete ${path.join('.')}`);
        }
        delete object[key];
      } else {
        object[key] = deleter(object[key], reference[key], messages, path);
      }
      path.pop();
    });
  }

  return object;
}

function removeKeyword(pkg, keywords, messages) {
  if (pkg.keywords !== undefined) {
    keywords.forEach(keyword => {
      if (pkg.keywords.find(k => k === keyword)) {
        messages.push(`docs(package): remove keyword ${keyword}`);
        pkg.keywords = pkg.keywords.filter(k => k !== keyword);
      }
    });

    if (pkg.keywords[0] === null || pkg.keywords[0] === undefined) {
      messages.push(`docs(package): remove keyword null`);
      pkg.keywords = [];
    }
  }
}

function addKeyword(pkg, regex, keyword, messages) {
  if (keyword === undefined || keyword === null || keyword === 'null') {
    return;
  }

  if (pkg.name.match(regex)) {
    if (pkg.keywords === undefined) {
      pkg.keywords = [];
    }
    if (!pkg.keywords.find(k => k === keyword)) {
      messages.push(`docs(package): add keyword ${keyword}`);
      pkg.keywords.push(keyword);
    }
  }
}
