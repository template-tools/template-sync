import {
  Provider,
  Repository,
  Branch,
  PullRequest
} from './repository-provider';

const github = require('github-basic');

// TODO
// handle rate limit
// statusCode: 403
// "API rate limit exceeded for [secure]."

export class GithubProvider extends Provider {
  static get repositoryClass() {
    return GithubRepository;
  }

  static get branchClass() {
    return GithubBranch;
  }

  constructor(token) {
    super();

    const client = github({ version: 3, auth: token });

    Object.defineProperty(this, 'client', { value: client });
  }
}

export class GithubRepository extends Repository {
  constructor(provider, name) {
    super(provider, name.replace(/#.*/, ''));
    Object.defineProperty(this, 'user', { value: name.split(/\//)[0] });
  }

  get client() {
    return this.provider.client;
  }

  async branches() {
    const res = await this.client.get(`/repos/${this.name}/branches`);

    res.forEach(b => {
      const branch = new this.provider.constructor.branchClass(this, b.name);
      this._branches.set(branch.name, branch);
    });

    return this._branches;
  }

  async createBranch(name, from) {
    const res = await this.client.get(
      `/repos/${this.name}/git/refs/heads/${from === undefined
        ? 'master'
        : from.name}`
    );

    const nb = await this.client.post(`/repos/${this.name}/git/refs`, {
      ref: `refs/heads/${name}`,
      sha: res.object.sha
    });

    const b = new this.provider.constructor.branchClass(this, name);
    this._branches.set(b.name, b);
    return b;
  }

  async deleteBranch(name) {
    const res = await this.client.delete(
      `/repos/${this.name}/git/refs/heads/${name}`
    );

    this._branches.delete(name);
  }

  async deletePullRequest(name) {
    /*
    const res = await this.client.delete(`/repos/${this.name}/pull/${name}`);
    console.log(res);
    return res;
    */
    //return new Error('not implemented');
  }
}

export class GithubBranch extends Branch {
  get client() {
    return this.provider.client;
  }

  async writeBlob(blob) {
    const path = blob.path.replace(/\\/g, '/').replace(/^\//, '');
    const mode = blob.mode || '100644';
    const type = blob.type || 'blob';

    const res = await this.client.post(
      `/repos/${this.repository.name}/git/blobs`,
      {
        content:
          typeof blob.content === 'string'
            ? blob.content
            : blob.content.toString('base64'),
        encoding: typeof blob.content === 'string' ? 'utf-8' : 'base64'
      }
    );

    return {
      path,
      mode,
      type,
      sha: res.sha
    };
  }

  async createPullRequest(to, msg) {
    const result = await this.client.post(
      `/repos/${this.repository.name}/pulls`,
      {
        title: msg.title,
        body: msg.body,
        base: this.name,
        head: to.name
      }
    );
    //console.log(result);
    return new PullRequest(this.repository, result.number);
  }

  async latestCommitSha() {
    const res = await this.client.get(
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`
    );
    return res.object.sha;
  }

  async baseTreeSha(commitSha) {
    const res = await this.client.get(
      `/repos/${this.repository.name}/commits/${commitSha}`
    );

    return res.commit.tree.sha;
  }

  async commit(message, blobs, options = {}) {
    const updates = await Promise.all(blobs.map(b => this.writeBlob(b)));

    const shaLatestCommit = await this.latestCommitSha();
    const shaBaseTree = await this.baseTreeSha(shaLatestCommit);
    let res = await this.client.post(
      `/repos/${this.repository.name}/git/trees`,
      {
        tree: updates,
        base_tree: shaBaseTree
      }
    );
    const shaNewTree = res.sha;

    res = await this.client.post(`/repos/${this.repository.name}/git/commits`, {
      message,
      tree: shaNewTree,
      parents: [shaLatestCommit]
    });
    const shaNewCommit = res.sha;

    res = await this.client.patch(
      `/repos/${this.repository.name}/git/refs/heads/${this.name}`,
      {
        sha: shaNewCommit,
        force: options.force || false
      }
    );

    return res;
  }

  async content(path, options = {}) {
    try {
      const res = await this.client.get(
        `/repos/${this.repository.name}/contents/${path}`,
        { ref: this.name }
      );
      const b = Buffer.from(res.content, 'base64');
      return b.toString();
    } catch (e) {
      if (options.ignoreMissing) {
        return '';
      }
    }
  }

  async tree(sha, prefix = '') {
    const res = await this.client.get(
      `/repos/${this.repository.name}/git/trees/${sha}`
    );
    const files = res.tree;

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
