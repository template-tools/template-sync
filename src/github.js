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
