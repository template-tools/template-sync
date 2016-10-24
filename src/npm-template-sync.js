//#!/usr/bin/env node

/* jslint node: true, esnext: true */

'use strict';

const commander = require('commander'),
  keychain = require('keychain'),
  github = require('octonode'),
  pr = require('pull-request');

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
  service: 'GitHub for Mac SSH key passphrase — github.com'
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
  /*'.travis.yml': {
    merger: t
  },
  'README.md': {
    merger: r,
  },*/
  'package.json': {
    merger: p
  }
};

function work(token, templateRepo = 'Kronos-Integration/npm-package-template', targetRepo =
  'arlac77/symatem-infrastructure') {
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
  const [tUser, tRepo] = templateRepo.split(/\//);

  Promise.all(fileNames.map(name =>
    Promise.all([getFile(targetRepo, name), getFile(templateRepo, name)])
    .then(contents => files[name].merger(contents[0], contents[1], {
      templateRepo, targetRepo
    }))
  )).then(transforms => {
    console.log(`files: ${fileNames}`);
    console.log(`user: ${user}`);
    console.log(`repo: ${repo}`);

    const source = {
      user: user,
      repo: repo,
      branch: 'master'
    };

    const dest = {
      user: user,
      repo: repo,
      branch: 'template-sync'
    };

    const options = {
      auth: {
        type: 'oauth',
        token: token
      }
    };

    pr.branch(user, repo, source.branch, dest.branch, options).then(() =>
        Promise.all(transforms.map((t, i) =>
          pr.commit(user, repo, {
            branch: dest.branch,
            message: `fix: merge ${fileNames[i]} from ${templateRepo}`,
            updates: [{
              path: fileNames[i],
              content: t
            }]
          }, options)))
        .then(() =>
          pr.pull(source, dest, {
            title: source.branch,
            body: 'Updated standard to latest version'
          }, options))
      )
      .then(r =>
        console.log(r))
      .catch(e => console.error(e));
  });
}
