/* jslint node: true, esnext: true */

'use strict';

const githubBasic = require('github-basic');

export function pull(from, to, msg, options) {
  return githubBasic.json('post', `/repos/${to.user}/${to.repo}/pulls`, {
    title: msg.title,
    body: msg.body,
    base: from.branch,
    head: to.branch
  }, options).nodeify();
}
