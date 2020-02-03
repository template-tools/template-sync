import { MergeLineSet } from './merge-line-set.mjs';

/**
 *
 */
export class NpmIgnore extends MergeLineSet {

  static get pattern() {
    return ".npmignore";
  }

  /**
   * entries to be skipped from result
   * @see https://docs.npmjs.com/misc/developers
   * @return {Set<string>}
   */
  get defaultIgnoreSet() {
    return new Set([
      '',
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
