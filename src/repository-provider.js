export class Provider {
  constructor() {
    Object.defineProperty(this, 'repositories', { value: new Map() });
  }

  async repository(name) {
    return this.repositories.get(name);
  }

  async branch(name) {
    return this.repository(name);
  }
}

export class Repository {
  constructor(provider, name) {
    Object.defineProperty(this, 'provider', { value: provider });
    Object.defineProperty(this, 'name', { value: name });
  }

  async content(path) {
    const branch = await this.branch('master');
    console.log(branch);
    return branch.content(path);
  }

  async branch(name) {
    return new Error('not implemented');
  }

  async branches() {
    return [];
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
