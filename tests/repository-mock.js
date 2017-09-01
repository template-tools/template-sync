import { Provider, Repository, Branch } from '../src/repository-provider';

export class MockProvider extends Provider {
  constructor(files) {
    super();
    Object.defineProperty(this, 'files', {
      value: files
    });
  }

  async repository(name) {
    return new MockRepository(this, name);
  }
}

export class MockRepository extends Repository {
  async branch(name) {
    return new MockBranch(this);
  }

  async branches() {
    return [new MockBranch(this)];
  }
}

export class MockBranch extends Branch {
  async content(path, options = {}) {
    if (
      this.provider.files[path] === undefined ||
      this.provider.files[path][this.repository.name] === undefined
    ) {
      if (options.ignoreMissing) {
        return '';
      }
      return '';
      //throw new Error(`missing ${path}`);
    }

    /*
    console.log(
      `content: ${path} -> ${this.provider.files[path][this.repository.name]}`
    );
*/
    return this.provider.files[path][this.repository.name];

    //return Buffer.from(this.provider.files[path][this.repository.name], 'utf8');
  }
}
