import { Provider, Repository, Branch } from './repository-provider';

const github = require('github-basic');

export class GithubProvider extends Provider {
  static get repositoryClass() {
    return GithubRepository;
  }

  static get branchClass() {
    return GithubBranch;
  }

  constructor(token) {
    super();

    Object.defineProperty(this, 'options', {
      value: {
        auth: {
          type: 'oauth',
          token
        }
      }
    });
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
    const res = await github.json(
      'get',
      `/repos/${this.name}/branches`,
      {},
      this.options
    );

    res.body.forEach(b => {
      const branch = new this.provider.constructor.branchClass(this, b.name);
      this._branches.set(branch.name, branch);
    });

    return this._branches;
  }

  async createBranch(name, from) {
    const res = await github.json(
      'get',
      `/repos/${this.name}/git/refs/heads/${from === undefined
        ? 'master'
        : from.name}`,
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
}

export class GithubBranch extends Branch {
  get options() {
    return this.provider.options;
  }

  async writeBlob(blob) {
    const path = blob.path.replace(/\\/g, '/').replace(/^\//, '');
    const mode = blob.mode || '100644';
    const type = blob.type || 'blob';

    const res = await github.json(
      'post',
      `/repos/${this.repository.name}/git/blobs`,
      {
        content:
          typeof blob.content === 'string'
            ? blob.content
            : blob.content.toString('base64'),
        encoding: typeof blob.content === 'string' ? 'utf-8' : 'base64'
      },
      this.options
    );

    return {
      path,
      mode,
      type,
      sha: res.body.sha
    };
  }

  createPullRequest(to, msg) {
    return github.json(
      'post',
      `/repos/${this.repository.name}/pulls`,
      {
        title: msg.title,
        body: msg.body,
        base: this.name,
        head: to.name
      },
      this.options
    );
  }

  async latestCommitSha() {
    const res = await github.json(
      'get',
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
      {},
      this.options
    );
    return res.body.object.sha;
  }

  async baseTreeSha(commitSha) {
    const res = await github.json(
      'get',
      `/repos/${this.repository.name}/commits/${commitSha}`,
      {},
      this.options
    );

    return res.body.commit.tree.sha;
  }

  async commit(message, blobs, options = {}) {
    const updates = await Promise.all(blobs.map(b => this.writeBlob(b)));

    const shaLatestCommit = await this.latestCommitSha();
    const shaBaseTree = await this.baseTreeSha(shaLatestCommit);
    let res = await github.json(
      'post',
      `/repos/${this.repository.name}/git/trees`,
      {
        tree: updates,
        base_tree: shaBaseTree
      },
      this.options
    );
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
    const shaNewCommit = res.body.sha;

    res = await github.json(
      'patch',
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
      {
        sha: shaNewCommit,
        force: options.force || false
      },
      this.options
    );

    return res.body;
  }

  async content(path, options = {}) {
    try {
      const res = await github.json(
        'get',
        `/repos/${this.repository.name}/contents/${path}`,
        { ref: this.name },
        this.options
      );
      const b = Buffer.from(res.body.content, 'base64');
      return b.toString();
    } catch (e) {
      if (options.ignoreMissing) {
        return '';
      }
    }
  }

  async tree(sha, prefix = '') {
    const res = await github.json(
      'get',
      `/repos/${this.repository.name}/git/trees/${sha}`,
      {},
      this.options
    );
    const files = res.body.tree;

    const dirs = await Promise.all(
      files
        .filter(f => f.type === 'tree')
        .map(dir => this.tree(dir.sha, prefix + dir.path + '/'))
    );

    return [
      ...files.map(f => {
        f.path = prefix + f.path;
        return f;
      }),
      ...dirs.map(d => d[0])
    ];
  }

  async list() {
    const shaBaseTree = await this.baseTreeSha(await this.latestCommitSha());
    return await this.tree(shaBaseTree);
  }
}
