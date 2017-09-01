import { Provider, Repository, Branch } from './repository-provider';

const github = require('github-basic');
const octonode = require('octonode');

export class GithubProvider extends Provider {
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

  async repository(name) {
    let r = this.repositories.get(name);
    if (r !== undefined) {
      return r;
    }
    r = new GithubRepository(this, name);
    this.repositories.set(name, r);
    return r;
  }
}

export class GithubRepository extends Repository {
  constructor(provider, name) {
    super(provider, name);
    Object.defineProperty(this, 'user', { value: name.split(/\//)[0] });
  }

  async branches() {
    return new Promise((resolve, reject) => {
      this.provider.client.repo(this.name).branches((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async createBranch(from, to) {
    const res = await github.json(
      'get',
      `/repos/${this.name}/git/refs/header/${from}`,
      {},
      this.options
    );

    return github.json(
      'post',
      `/repos/${this.name}/git/ref`,
      {
        ref: 'refs/heads/' + to,
        sha: res.body.object.sha
      },
      this.options
    );
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
                this.provider.options
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
          this.provider.options
        );
      })
      .then(res => {
        shaLatestCommit = res.body.object.sha;
        return github.json(
          'get',
          `/repos/${this.repository.name}/commits/${shaLatestCommit}`,
          {},
          this.provider.options
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
          this.provider.options
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
          this.provider.options
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
          this.provider.options
        );
      });
  }

  content(path, options = {}) {
    return new Promise((resolve, reject) =>
      this.repository.client.repo(repo).contents(path, (err, status, body) => {
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
