/* jslint node: true, esnext: true */

'use strict';

const program = require('commander'),
  keychain = require('keychain'),
  prompt = require('prompt'),
  github = require('octonode'),
  githubBasic = require('github-basic');

import {
  pull, createBranch, commit
}
from './github';
import Context from './Context';
import Travis from './Travis';
import Readme from './Readme';
import Package from './Package';
import License from './License';
import Replace from './Replace';
import ReplaceIfEmpty from './ReplaceIfEmpty';
import MergeLineSet from './MergeLineSet';

require('pkginfo')(module, 'version');

program
  .description('Keep npm package in sync with its template')
  .version(module.exports.version)
  .option('-k, --keystore <account/service>', 'keystore')
  .option('-s, --save', 'save keystore')
  .option('-t, --template <user/repo>', 'template repository')
  .parse(process.argv);

process.on('uncaughtException', err => console.error(err));
process.on('unhandledRejection', reason => console.error(reason));

const keystore = {
  account: 'arlac77',
  service: 'GitHub for Mac SSH key passphrase — github.com'
};

if (program.keystore) {
  [keystore.account, keystore.service] = program.keystore.split(/\//);
}

if (program.save) {
  prompt.start();
  const schema = {
    properties: {
      password: {
        required: true,
        hidden: true
      }
    }
  };
  prompt.get(schema, (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    keychain.setPassword({
      account: keystore.account,
      service: keystore.service,
      password: result.password
    }, (err, pass) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('password set');
    });
  });
}

keychain.getPassword(keystore, (err, pass) => {
  if (err) {
    console.error(err);
    return;
  }
  program.args.forEach(repo => work(pass, repo, program.template));
});


function work(token, targetRepo, templateRepo = 'Kronos-Tools/npm-package-template') {
  const client = github.client(token);
  const [user, repo, branch] = targetRepo.split(/[\/#]/);
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
    branch: branch || 'master'
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

  getBranches(targetRepo.replace(/#.*/, ''))
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
        'date.year': new Date().getFullYear(),
        'license.owner': user
      });

      const files = [
        new ReplaceIfEmpty(context, 'rollup.config.js'),
        new Package(context, 'package.json'),
        new Readme(context, 'doc/README.hbs'),
        new Travis(context, '.travis.yml'),
        new MergeLineSet(context, '.gitignore'),
        new MergeLineSet(context, '.npmignore'),
        new License(context, 'LICENSE')
      ];

      return Promise.all(files.map(f => f.merge)).then(merges => merges.filter(m => m.changed));
    }).then(merges => {
      console.log(merges.map(m => m.path + ': ' + m.changed).join(','));
      if (merges.length === 0) {
        console.log(`nothing changed`);
        return;
      }
      return createBranch(user, repo, source.branch, dest.branch, options).then(() =>

        commit(user, repo, {
          branch: dest.branch,
          message: `fix(package): merge package template from ${templateRepo}`,
          updates: merges.map(merge => {
            return {
              path: merge.path,
              content: merge.content
            };
          })
        }, options)

        /*
                Promise.all(merges.map(merge => commit(user, repo, {
                  branch: dest.branch,
                  message: merge.message ? merge.message : `fix(package): merge package template from ${templateRepo}`,
                  updates: [{
                    path: merge.path,
                    content: merge.content
                  }]
                }, options)))
        */

        .then(
          () =>
          pull(source, dest, {
            title: `merge package template from ${templateRepo}`,
            body: 'Updated standard to latest version'
          }, options))
        .then(r => console.log(r.body.html_url))
      );
    }).catch(e => console.error(e));
}
