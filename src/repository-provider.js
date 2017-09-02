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

  constructor() {
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

  async branch(name) {
    return this.repository(name);
  }
}

export class Repository {
  constructor(provider, name) {
    Object.defineProperty(this, 'provider', { value: provider });
    Object.defineProperty(this, 'name', { value: name });
    Object.defineProperty(this, '_branches', { value: new Map() });
  }

  async content(path) {
    const branch = await this.branch('master');
    console.log(branch);
    return branch.content(path);
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

  async createPullRequest() {
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

  async content(path) {
    return new Error('not implemented');
  }

  async commit(message, updates, options) {
    return new Error('not implemented');
  }
}
