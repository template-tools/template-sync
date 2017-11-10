import { Provider, Repository, Branch } from './repository-provider';

const makeDir = require('make-dir');
const execa = require('execa');
const { promisify } = require('util');
const fs = require('fs');

const stat = promisify(fs.stat);

export class LocalProvider extends Provider {
  static get repositoryClass() {
    return LocalRepository;
  }

  static get branchClass() {
    return LocalBranch;
  }
}

export class LocalRepository extends Repository {
  get workspace() {
    return this.provider.config.workspace;
  }

  async initialize() {
    try {
      await stat(this.workspace);
    } catch (e) {
      const result = await execa('git', ['clone', this.name, this.workspace]);
    }
  }
}

export class LocalBranch extends Branch {}
