import { Provider, Repository, Branch } from './repository-provider';

const github = require('github-basic');
const octonode = require('octonode');

export class GithubProvider extends Provider {
  static get repositoryClass() {
    return GithubRepository;
  }

  static get branchClass() {
    return GithubBranch;
  }

  constructor(token) {
    super();

    const client = octonode.client(token);

    Object.defineProperty(this, 'options', {
      value: {
        auth: {
          type: 'oauth',
          token
        }
      }
    });

    Object.defineProperty(this, 'client', { value: client });
  }
}

export class GithubRepository extends Repository {
  constructor(provider, name) {
    super(provider, name);
    Object.defineProperty(this, 'user', { value: name.split(/\//)[0] });
  }

  get options() {
    return this.provider.options;
  }

  async branches() {
    return new Promise((resolve, reject) => {
      this.provider.client.repo(this.name).branches((err, data) => {
        if (err) {
          reject(err);
        } else {
          data.forEach(d => {
            const b = new this.provider.constructor.branchClass(this, d.name);
            this._branches.set(b.name, b);
          });
          resolve(this._branches);
        }
      });
    });
  }

  async createBranch(name, from = 'master') {
    const res = await github.json(
      'get',
      `/repos/${this.name}/git/refs/heads/${from}`,
      {},
      this.options
    );

    const nb = await github.json(
      'post',
      `/repos/${this.name}/git/refs`,
      {
        ref: `refs/heads/${name}`,
        sha: res.body.object.sha
      },
      this.options
    );

    const b = new this.provider.constructor.branchClass(this, name);
    this._branches.set(b.name, b);
    return b;
  }

  createPullRequest(from, to, msg) {
    return github.json(
      'post',
      `/repos/${to.user}/${to.repo}/pulls`,
      {
        title: msg.title,
        body: msg.body,
        base: from.branch,
        head: to.branch
      },
      this.options
    );
  }
}

export class GithubBranch extends Branch {
  get options() {
    return this.provider.options;
  }

  async commit(message, updates, options = {}) {
    updates = await Promise.all(
      updates.map(file => {
        const path = file.path.replace(/\\/g, '/').replace(/^\//, '');
        const mode = file.mode || '100644';
        const type = file.type || 'blob';
        return github
          .json(
            'post',
            `/repos/${this.repository.name}/git/blobs`,
            {
              content:
                typeof file.content === 'string'
                  ? file.content
                  : file.content.toString('base64'),
              encoding: typeof file.content === 'string' ? 'utf-8' : 'base64'
            },
            this.options
          )
          .then(res => {
            return {
              path,
              mode,
              type,
              sha: res.body.sha
            };
          });
      })
    );

    let res = await github.json(
      'get',
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
      {},
      this.options
    );

    const shaLatestCommit = res.body.object.sha;

    res = await github.json(
      'get',
      `/repos/${this.repository.name}/commits/${shaLatestCommit}`,
      {},
      this.options
    );

    console.log(`*** 4 ***`);

    const shaBaseTree = res.body.tree.sha;
    res = await github.json(
      'post',
      `/repos/${this.repository.name}/git/trees`,
      {
        tree: updates,
        base_tree: shaBaseTree
      },
      this.options
    );

    console.log(`*** 5 ***`);

    const shaNewTree = res.body.sha;
    res = await github.json(
      'post',
      `/repos/${this.repository.name}/git/commits`,
      {
        message,
        tree: shaNewTree,
        parents: [shaLatestCommit]
      },
      this.options
    );

    console.log(`*** 6 ***`);

    const shaNewCommit = res.body.sha;
    return github.json(
      'patch',
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
      {
        sha: shaNewCommit,
        force: options.force || false
      },
      this.options
    );
  }

  content(path, options = {}) {
    return new Promise((resolve, reject) =>
      this.repository.client
        .repo(this.repository.name)
        .contents(path, (err, status, body) => {
          if (err) {
            if (options.ignoreMissing) {
              resolve('');
            } else {
              reject(new Error(`${path}: ${err}`));
            }
          } else {
            const b = Buffer.from(status.content, 'base64');
            resolve(b.toString());
          }
        })
    );
  }
}
