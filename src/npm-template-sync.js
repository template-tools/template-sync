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

import Travis from './Travis';
import Readme from './Readme';
import Package from './Package';
import License from './License';
import Replace from './Replace';
import ReplaceIfEmpty from './ReplaceIfEmpty';

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



class Context {
  constructor(client, targetRepo, templateRepo, properties) {
    this.ctx = createContext({
      keepUndefinedValues: true,
      leftMarker: '{{',
      rightMarker: '}}',
      markerRegexp: '\{\{([^\}]+)\}\}'
    });

    this.ctx.properties = properties;

    Object.defineProperty(this, 'properties', {
      value: properties
    });

    Object.defineProperty(this, 'files', {
      value: new Map()
    });

    Object.defineProperty(this, 'client', {
      value: client
    });

    Object.defineProperty(this, 'targetRepo', {
      value: targetRepo
    });

    Object.defineProperty(this, 'templateRepo', {
      value: templateRepo
    });
  }

  expand(...args) {
    return this.ctx.expand(...args);
  }

  addFile(file) {
    this.files.set(file.path, file);
  }
}

function work(token, templateRepo = 'Kronos-Tools/npm-package-template', targetRepo =
  'arlac77/symatem-infrastructure') {
  const client = github.client(token);

  const [user, repo] = targetRepo.split(/\//);
  const [tUser, tRepo] = templateRepo.split(/\//);

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
    }).then(() => {
      const context = new Context(client, targetRepo, templateRepo, {
        'github.user': user,
        'github.repo': repo,
        'name': repo,
        'date.year': '2016',
        'license.owner': user
      });

      const files = [
        new ReplaceIfEmpty(context, 'rollup.config.js'),
        new Package(context, 'package.json'),
        new Readme(context, 'doc/README.hbs'),
        new Travis(context, '.travis.yml'),
        new Replace(context, '.gitignore'),
        new Replace(context, '.npmignore'),
        new License(context, 'LICENSE')
      ];

      return Promise.all(files.map(f => f.mergedContent)).then(
        contents =>
        contents.map((c, i) => {
          return {
            path: files[i].path,
            content: c
          };
        })
      );
    }).then(files =>
      pr.branch(user, repo, source.branch, dest.branch, options).then(() =>
        pr.commit(user, repo, {
          branch: dest.branch,
          message: `fix(package): merge package template from ${templateRepo}`,
          updates: files
        }, options).then(
          () =>
          pull(source, dest, {
            title: `merge package template from ${templateRepo}`,
            body: 'Updated standard to latest version'
          }, options)).then(r => console.log(r.body.html_url))
      )
    );
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
