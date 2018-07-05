import { MergeAndRemoveLineSet } from './merge-and-remove-line-set';

/**
 *
 */
export class NpmIgnore extends MergeAndRemoveLineSet {
  static matchesFileName(name) {
    return name === '.npmignore';
  }

  /**
   * entries to be skipped from result
   * @see https://docs.npmjs.com/misc/developers
   * @return {Set<string>}
   */
  get defaultIgnoreSet() {
    return new Set([
      '.*.swp',
      '._*',
      '.DS_Store',
      '.git',
      '.github',
      '.hg',
      '.npmrc',
      '.lock-wscript',
      '.svn',
      '.wafpickle-*',
      'config.gypi',
      'CVS',
      'npm-debug.log'
    ]);
  }
}
