import { Provider, Repository, Branch } from './repository-provider';

export class BitbucketProvider extends Provider {
  static get repositoryClass() {
    return BitbucketRepository;
  }

  static get branchClass() {
    return BitbucketBranch;
  }

  constructor(options = {}) {
    super();
  }
}

export class BitbucketRepository extends Repository {
  constructor(provider, name) {
    super(provider, name);
  }
}

export class BitbucketBranch extends Branch {}
