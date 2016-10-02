//#!/usr/bin/env node

/* jslint node: true, esnext: true */

'use strict';

const githubChangeRemoteFiles = require('@boennemann/github-change-remote-files'),
  commander = require('commander'),
  yaml = require('js-yaml'),
  keychain = require('keychain'),
  github = require('octonode');

import t from './travis';
import r from './readme';
import p from './package';

commander
  .option('-k, --keystore [account/service]', 'keystore')
  .option('-s, --save', 'save keystore')
  .option('-r, --repo [user/repo]', 'repo')
  .option('-t, --template [user/repo]', 'template')
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
  work(pass, commander.template, commander.repo);
});

const files = {
  /*  '.travis.yml': {
      merger: t
    },
    'readme.md': {
      merger: r,
    },*/
  'package.json': {
    merger: p
  }
};

function work(token, templateRepo = 'Kronos-Integration/npm-package-template', targetRepo = 'arlac77/loglevel-mixin') {
  const client = github.client(token);

  function getFile(repo, file) {
    const ghrepo = client.repo(repo);
    return new Promise((fullfill, reject) => {
      ghrepo.contents(file, (err, status, body, headers) => {
        if (err) {
          reject(err);
        } else {
          const b = new Buffer(status.content, 'base64');
          fullfill(b.toString());
        }
      });
    });
  }

  const fileNames = Object.keys(files);
  const [user, repo] = targetRepo.split(/\//);

  Promise.all(fileNames.map(name =>
    getFile(templateRepo, name)
    .then(template =>
      target => files[name].merger(target, template, {
        templateRepo, targetRepo
      })
    )
  )).then(transforms => {
    console.log(`files: ${fileNames}`);
    console.log(`user: ${user}`);
    console.log(`repo: ${repo}`);
    githubChangeRemoteFiles({
      user: user,
      repo: repo,
      filenames: fileNames,
      transforms: transforms,
      token: token,
      pr: {
        title: 'Updated standard to latest version',
        body: 'whatever'
      }
    }, function (err, res) {
      console.error(err);
    });
  });
}
