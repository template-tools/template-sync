/* jslint node: true, esnext: true */

'use strict';

const github = require('github-basic');

export function pull(from, to, msg, options) {
  return github.json('post', `/repos/${to.user}/${to.repo}/pulls`, {
    title: msg.title,
    body: msg.body,
    base: from.branch,
    head: to.branch
  }, options);
}

export function createBranch(user, repo, from, to, options) {
  return github.json('get', '/repos/:owner/:repo/git/refs/:ref', {
      owner: user,
      repo: repo,
      ref: 'heads/' + from
    }, options)
    .then(res =>
      github.json('post', '/repos/:owner/:repo/git/refs', {
        owner: user,
        repo: repo,
        ref: 'refs/heads/' + to,
        sha: res.body.object.sha
      }, options)
    );
}

export function commit(user, repo, commit, options) {
  let {
    branch, updates, message
  } = commit;
  let shaLatestCommit, shaBaseTree, shaNewTree, shaNewCommit;

  return Promise.resolve(null).then(() => {
    updates = Promise.all(updates.map(file => {
      const path = file.path.replace(/\\/g, '/').replace(/^\//, '');
      const mode = file.mode || '100644';
      const type = file.type || 'blob';
      return github.json('post', '/repos/:owner/:repo/git/blobs', {
        owner: user,
        repo: repo,
        content: typeof file.content === 'string' ? file.content : file.content.toString('base64'),
        encoding: typeof file.content === 'string' ? 'utf-8' : 'base64'
      }, options).then(res => {
        return {
          path: path,
          mode: mode,
          type: type,
          sha: res.body.sha
        };
      });
    }));

    return github.json('get', '/repos/:owner/:repo/git/refs/:ref', {
      owner: user,
      repo: repo,
      ref: 'heads/' + branch
    }, options);
  }).then(res => {
    shaLatestCommit = res.body.object.sha;
    return github.json('get', '/repos/:owner/:repo/git/commits/:sha', {
      owner: user,
      repo: repo,
      sha: shaLatestCommit
    }, options);
  }).then(res => {
    shaBaseTree = res.body.tree.sha;
    return updates;
  }).then(updates => {
    return github.json('post', '/repos/:owner/:repo/git/trees', {
      owner: user,
      repo: repo,
      tree: updates,
      base_tree: shaBaseTree
    }, options);
  }).then(res => {
    shaNewTree = res.body.sha;
    return github.json('post', '/repos/:owner/:repo/git/commits', {
      owner: user,
      repo: repo,
      message: message,
      tree: shaNewTree,
      parents: [shaLatestCommit]
    }, options);
  }).then(res => {
    shaNewCommit = res.body.sha;
    return github.json('patch', '/repos/:owner/:repo/git/refs/:ref', {
      owner: user,
      repo: repo,
      ref: 'heads/' + branch,
      sha: shaNewCommit,
      force: options.force || false
    }, options);
  });
}
