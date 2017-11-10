export class Provider {
  /**
   * @return repository class used by the Provider
   */
  static get repositoryClass() {
    return Repositoy;
  }

  /**
   * @return branch class used by the Provider
   */
  static get branchClass() {
    return Branch;
  }

  /**
   * @return pull request class used by the Provider
   */
  static get pullRequestClass() {
    return PullRequest;
  }

  static config(config) {
    return Object.assign({}, config);
  }

  constructor(config) {
    Object.defineProperty(this, 'config', {
      value: this.constructor.config(config)
    });

    Object.defineProperty(this, 'repositories', { value: new Map() });
  }

  async repository(name) {
    let r = this.repositories.get(name);
    if (r === undefined) {
      r = new this.constructor.repositoryClass(this, name);
      this.repositories.set(name, r);
    }

    return r;
  }
}

export class Repository {
  constructor(provider, name) {
    Object.defineProperty(this, 'provider', { value: provider });
    Object.defineProperty(this, 'name', { value: name });
    Object.defineProperty(this, '_branches', { value: new Map() });
  }

  async content(...args) {
    const branch = await this.branch('master');
    return branch.content(...args);
  }

  async branch(name) {
    let b = this._branches.get(name);
    if (b === undefined) {
      b = new this.provider.constructor.branchClass(this, name);
      this._branches.set(name, b);
    }

    return b;
  }

  /**
   * @return {Map} of all branches
   */
  async branches() {
    return this._branches;
  }

  async createBranch(name) {
    return new Error('not implemented');
  }

  async deleteBranch(name) {
    return new Error('not implemented');
  }

  async createPullRequest() {
    return new Error('not implemented');
  }

  async deletePullRequest(name) {
    return new Error('not implemented');
  }
}

export class Branch {
  constructor(repository, name = 'master') {
    Object.defineProperty(this, 'repository', { value: repository });
    Object.defineProperty(this, 'name', { value: name });
  }

  get provider() {
    return this.repository.provider;
  }

  delete() {
    return this.repository.deleteBarnch(this.name);
  }

  async content(path) {
    return new Error('not implemented');
  }

  async commit(message, updates, options) {
    return new Error('not implemented');
  }

  async createPullRequest(toBranch, msg) {
    return new Error('not implemented');
  }

  async list() {
    return [];
  }
}

export class PullRequest {
  constructor(repository, name) {
    Object.defineProperty(this, 'repository', { value: repository });
    Object.defineProperty(this, 'name', { value: name });
  }

  get provider() {
    return this.repository.provider;
  }

  delete() {
    return this.repository.deletePullRequest(this.name);
  }
}
