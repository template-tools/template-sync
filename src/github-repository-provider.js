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
    return this.provicer.options;
  }

  async commit(message, updates) {
    let shaLatestCommit, shaBaseTree, shaNewTree, shaNewCommit;

    return Promise.resolve()
      .then(() => {
        updates = Promise.all(
          updates.map(file => {
            const path = file.path.replace(/\\/g, '/').replace(/^\//, '');
            const mode = file.mode || '100644';
            const type = file.type || 'blob';
            return github
              .json(
                'post',
                `/repos/${this.repository.name}/git/blobs/`,
                {
                  content:
                    typeof file.content === 'string'
                      ? file.content
                      : file.content.toString('base64'),
                  encoding:
                    typeof file.content === 'string' ? 'utf-8' : 'base64'
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

        return github.json(
          'get',
          `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
          {},
          this.options
        );
      })
      .then(res => {
        shaLatestCommit = res.body.object.sha;
        return github.json(
          'get',
          `/repos/${this.repository.name}/commits/${shaLatestCommit}`,
          {},
          this.options
        );
      })
      .then(res => {
        shaBaseTree = res.body.tree.sha;
        return updates;
      })
      .then(updates => {
        return github.json(
          'post',
          `/repos/${this.repository.name}/git/trees`,
          {
            tree: updates,
            base_tree: shaBaseTree
          },
          this.options
        );
      })
      .then(res => {
        shaNewTree = res.body.sha;
        return github.json(
          'post',
          `/repos/${this.repository.name}/git/commits`,
          {
            message: message,
            tree: shaNewTree,
            parents: [shaLatestCommit]
          },
          this.options
        );
      })
      .then(res => {
        shaNewCommit = res.body.sha;
        return github.json(
          'patch',
          `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
          {
            sha: shaNewCommit,
            force: options.force || false
          },
          this.options
        );
      });
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
