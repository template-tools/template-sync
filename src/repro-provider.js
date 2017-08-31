export class Provider {
  async repro(name) {
    return undefined;
  }
}

export class Repro {
  constructor(provider, name) {
    Object.definedProperty(this, 'provider', { value: provider });
    Object.definedProperty(this, 'name', { value: name });
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
  constructor(repro, name = 'master') {
    Object.definedProperty(this, 'repro', { value: repro });
    Object.definedProperty(this, 'name', { value: name });
  }

  async content(path) {
    return new Error('not implemented');
  }
}
