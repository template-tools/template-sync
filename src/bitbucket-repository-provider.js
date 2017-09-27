import { Provider, Repository, Branch } from './repository-provider';

const { Client } = require('bitbucket-server-nodejs');

export class BitbucketProvider extends Provider {
  static get repositoryClass() {
    return BitbucketRepository;
  }

  static get branchClass() {
    return BitbucketBranch;
  }

  constructor(auth = {}) {
    super();
    Object.defineProperty(this, 'client', {
      value: new Client('https://api.bitbucket.org/2.0', auth)
    });
  }
}

export class BitbucketRepository extends Repository {
  constructor(provider, name) {
    super(provider, name.replace(/#.*/, ''));
    Object.defineProperty(this, 'user', { value: name.split(/\//)[0] });
  }

  get client() {
    return this.provider.client;
  }

  async branches() {
    const res = await this.client.get(
      `repositories/${this.name}/refs/branches`
    );

    //console.log(res);

    res.values.forEach(b => {
      const branch = new this.provider.constructor.branchClass(this, b.name);
      this._branches.set(branch.name, branch);
    });

    return this._branches;
  }
}

export class BitbucketBranch extends Branch {
  get client() {
    return this.provider.client;
  }

  async content(path, options = {}) {
    try {
      const res = await this.client.get(
        `repositories/${this.repository.name}/raw/${this.name}/${path}`
      );
      return res;
    } catch (e) {
      if (options.ignoreMissing) {
        return '';
      }
    }
  }

  async tree(path) {
    const res = await this.client.get(
      `repositories/${this.repository.name}/src/${this.name}/${path}`
    );

    return res.values.map(e => {
      return { path: e.path };
    });
  }

  async list() {
    return this.tree('/');
  }
}
