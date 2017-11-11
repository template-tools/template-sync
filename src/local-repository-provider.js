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
      const result = await execa('git', ['pull'], { cwd: this.workspace });
    } catch (e) {
      const result = await execa('git', ['clone', this.name, this.workspace]);
    }
  }

  async branches() {
    const result = await execa('git', ['branch'], {
      cwd: this.workspace
    });

    result.stdout.split(/\n/).forEach(b => {
      const m = b.match(/^\*?\s*([^\s]+)/);
      if (m) {
        const name = m[1];
        const branch = new this.provider.constructor.branchClass(this, name);
        this._branches.set(branch.name, branch);
      }
    });

    return this._branches;
  }

  async createBranch(name, from) {
    const result = await execa('git', ['checkout', '-b', name], {
      cwd: this.workspace
    });

    const b = new this.provider.constructor.branchClass(this, name);
    this._branches.set(b.name, b);
    return b;
  }

  async deleteBranch(name) {
    await execa('git', ['checkout', 'master'], {
      cwd: this.workspace
    });

    const result = await execa('git', ['branch', '-D', name], {
      cwd: this.workspace
    });

    this._branches.delete(name);
  }
}

export class LocalBranch extends Branch {}
