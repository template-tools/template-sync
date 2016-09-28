//#!/usr/bin/env node

/* jslint node: true, esnext: true */

'use strict';

const githubChangeRemoteFile = require('github-change-remote-file'),
  commander = require('commander'),
  yaml = require('js-yaml'),
  keychain = require('keychain');


import t from './travis';
import r from './readme';
import p from './package';

commander
  .option('-k, --keystore [account/service]', 'keystore')
  .option('-s, --save', 'save keystore')
  .option('-r, --repo [user/repo]', 'repo')
  .parse(process.argv);

const keystore = {
  account: 'arlac77',
  service: 'github_token'
};

if (commander.keystore) {
  const v = commander.keystore.split(/\//);
  keystore.account = v[0];
  keystore.service = v[1];
}


let user = 'Kronos-Integration';
let repo = 'kronos-main';

if (commander.repo) {
  const v = commander.repo.split(/\//);
  user = v[0];
  repo = v[1];
}

if (commander.save) {
  keychain.setPassword({
    account: keystore.account,
    service: keystore.service,
    password: 'xxx'
  }, function (err, pass) {
    if (err) {
      console.error(`${err}`);
      return;
    }
    console.log('password set');
  });
}

keychain.getPassword(keystore, (err, pass) => {
  if (err) {
    console.error(`${err}`);
    return;
  }
  work(pass);
});

const files = {
  '.travis.yml': {
    merger: t
  },
  'readme.md': {
    merger: r,
  },
  'package.json': {
    merger: p
  }
};

function work(token) {
  Object.keys(files).forEach(name => {
    const file = files[name];

    githubChangeRemoteFile({
      user: user,
      repo: repo,
      filename: name,
      transform: content => {
        return file.merger(content, undefined, {
          user: user,
          repo: repo
        });
      },
      token: token,
      pr: {
        title: `docs(readme): sync ${name} from npm-package-template`,
        body: 'badges'
      }
    }, (err, res) => {
      if (err) {
        console.error(err);
      } else {
        console.log(res.html_url);
      }
    });
  });
}
