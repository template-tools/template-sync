//#!/usr/bin/env node

/* jslint node: true, esnext: true */

'use strict';

const commander = require('commander'),
  keychain = require('keychain'),
  github = require('octonode'),
  githubBasic = require('github-basic'),

  pr = require('pull-request');

import {
  createContext
}
from 'expression-expander';

import travis from './travis';
import readme from './readme';
import pkg from './package';
import license from './license';
import replace from './replace';

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
  '.travis.yml': {
    merger: travis
  },
  'doc/README.hbs': {
    merger: readme,
  },
  'package.json': {
    merger: pkg
  },
  '.gitignore': {
    merger: replace
  },
  '.npmignore': {
    merger: replace
  },
  'rollup.config.js': {
    merger: replace
  },
  'LICENSE': {
    merger: license
  }
};

function work(token, templateRepo = 'Kronos-Tools/npm-package-template', targetRepo =
  'arlac77/symatem-infrastructure') {
  const client = github.client(token);

  function getBranches(repo) {
    return new Promise((fullfill, reject) => {
      client.repo(repo).branches((err, data) => {
        if (err) {
          reject(err);
        } else {
          fullfill(data);
        }
      });
    });
  }

  function getFile(repo, file, options = {}) {
    return new Promise((fullfill, reject) =>
      client.repo(repo).contents(file, (err, status, body, headers) => {
        if (err) {
          if (options.ignoreMissingFiles) {
            fullfill('');
          } else {
            reject(err);
          }
        } else {
          const b = new Buffer(status.content, 'base64');
          fullfill(b.toString());
        }
      })
    );
  }

  const fileNames = Object.keys(files);
  const [user, repo] = targetRepo.split(/\//);
  const [tUser, tRepo] = templateRepo.split(/\//);

  const context = createContext({
    keepUndefinedValues: true,
    leftMarker: '{{',
    rightMarker: '}}',
    markerRegexp: '\{\{([^\}]+)\}\}'
  });

  context.properties = {
    'github.user': user,
    'github.repo': repo,
    'name': repo,
    'date.year': '2016',
    'license.owner': user
  };

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

  getBranches(targetRepo)
    .then(branches => {
      const maxBranchId = branches.reduce((prev, current) => {
        const m = current.name.match(/template-sync-(\d+)/);
        if (m) {
          const r = parseInt(m[1]);
          if (r > prev) {
            return r;
          }
        }

        return prev;
      }, 0);

      dest.branch += `-${maxBranchId + 1}`;
    }).then(() =>
      Promise.all(fileNames.map(name =>
        Promise.all([getFile(targetRepo, name, {
          ignoreMissingFiles: true
        }), getFile(templateRepo, name)])
        .then(contents => files[name].merger(contents[0], contents[1], context, {
          templateRepo, targetRepo
        }))
      )).then(transforms =>
        pr.branch(user, repo, source.branch, dest.branch, options).then(() =>
          pr.commit(user, repo, {
            branch: dest.branch,
            message: `fix(package): merge package template from ${templateRepo}`,
            updates: transforms.map((t, i) => {
              return {
                path: fileNames[i],
                content: t
              };
            })
          }, options)
          .then(() =>
            pull(source, dest, {
              title: `merge package template from ${templateRepo}`,
              body: 'Updated standard to latest version'
            }, options))
        )
      )).then(r => console.log(r.body))
    .catch(e => {
      console.error(e);
      //console.log(e.body.errors);
    });
}

function pull(from, to, msg, options, callback) {
  var query = {
    base: from.branch,
    head: to.branch
  };
  if (typeof msg.issue === 'number') {
    query.issue = msg.issue.toString();
  } else {
    query.title = msg.title;
    query.body = msg.body || '';
  }

  return githubBasic.json('post', `/repos/${to.user}/${to.repo}/pulls`, query, options).nodeify(callback);
}
