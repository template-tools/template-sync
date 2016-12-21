/* jslint node: true, esnext: true */

'use strict';

const program = require('commander'),
  keychain = require('keychain'),
  prompt = require('prompt'),
  github = require('octonode'),
  githubBasic = require('github-basic'),
  pr = require('pull-request');

import Context from './Context';
import Travis from './Travis';
import Readme from './Readme';
import Package from './Package';
import License from './License';
import Replace from './Replace';
import ReplaceIfEmpty from './ReplaceIfEmpty';

program
  .description('Keep npm package in sync with its template')
  .option('-k, --keystore <account/service>', 'keystore')
  .option('-s, --save', 'save keystore')
  .option('-t, --template <user/repo>', 'template repository')
  .parse(process.argv);

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
    ).catch(e => console.error(e));
}

function pull(from, to, msg, options) {
  return githubBasic.json('post', `/repos/${to.user}/${to.repo}/pulls`, {
    title: msg.title,
    body: msg.body,
    base: from.branch,
    head: to.branch
  }, options).nodeify();
}
