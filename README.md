[![npm](https://img.shields.io/npm/v/npm-template-sync.svg)](https://www.npmjs.com/package/npm-template-sync)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/npm-template-sync)](https://bundlephobia.com/result?p=npm-template-sync)
[![downloads](http://img.shields.io/npm/dm/npm-template-sync.svg?style=flat-square)](https://npmjs.org/package/npm-template-sync)
[![Build Status](https://travis-ci.com/arlac77/npm-template-sync.svg?branch=master)](https://travis-ci.com/arlac77/npm-template-sync)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/arlac77/npm-template-sync.git)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-template-sync/badge.svg)](https://snyk.io/test/github/arlac77/npm-template-sync)
[![codecov.io](http://codecov.io/github/arlac77/npm-template-sync/coverage.svg?branch=master)](http://codecov.io/github/arlac77/npm-template-sync?branch=master)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-template-sync/badge.svg)](https://coveralls.io/r/arlac77/npm-template-sync)

## npm-template-sync

Keep repository in sync with its template.

Generates pull requests to bring a repository back in sync with the template.

```shell
export GH_TOKEN='token providing repositroy write access' # for github repos

npm-template-sync --template aTemplateGithubUser/aRepo myGithubUser/myRepo
```

define (initial) properties to be used in the template

```shell
export GH_TOKEN='token providing repositroy write access' # for github repos

npm-template-sync --define "description=a very new fantastic module" -t myUser/myTemplate myUser/newModule#aBranch
```


switch from [arlac77/template-github](https://github.com/arlac77/template-github) to [arlac77/template-arlac77-github](https://github.com/arlac77/template-arlac77-github) template for [arlac77/url-cmd](https://github.com/arlac77/url-cmd), [arlac77/uti](https://github.com/arlac77/uti), [arlac77/content-entry](https://github.com/arlac77/content-entry) and [arlac77/repository-provider](https://github.com/arlac77/repository-provider)

```shell
export GH_TOKEN='token providing repositroy write access' # for github repos

npm-template-sync --track --template arlac77/template-arlac77-github --template -arlac77/template-github arlac77/url-cmd arlac77/uti arlac77/content-entry arlac77/repository-provider
```

merges contents from template branch into destination branch handling some special cases for:

-   Licenses - rewriting license years
-   line set files like .npmignore and .gitignore - by merging both sets together
-   package.json - merge (.\*)[Dd]ependencies, engines and scripts
-   rollup.conf.\*js - copy / rewrite + detect dev dependencies
-   [\*.yaml - merge](doc/yaml)
-   [.travis.yml - merge with hints](doc/travis)
-   [\*.toml - merge](doc/toml)
-   [\*.ini - merge](doc/ini)
-   [\*.json - merge](doc/json)
-   README.md - merge badges

![generated pull request](doc/pr_sample.png)

## Some templates

-   [arlac77/template-cli-app](https://github.com/arlac77/template-cli-app) _rollup_ _ava_ _travis_
-   [arlac77/template-esm-only](https://github.com/arlac77/template-esm-only) _ava_ _travis_
-   [arlac77/template-svelte-component](https://github.com/arlac77/template-svelte-component) _svelte_ _rollup_ _testcafe_ _travis_
-   [arlac77/template-svelte-app](https://github.com/arlac77/template-svelte-app) _svelte_ _rollup_ _pkgbuild_ _travis_
-   [arlac77/template-kronos-module](https://github.com/arlac77/template-kronos-module) template-esm-only with node 14
-   [arlac77/template-kronos-app](https://github.com/arlac77/template-kronos-app) node 14 + systemd

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [Context](#context)
    -   [Parameters](#parameters)
    -   [Properties](#properties)
    -   [executeBranch](#executebranch)
-   [sortedKeys](#sortedkeys)
-   [Package](#package)
    -   [properties](#properties-1)
        -   [Parameters](#parameters-1)
-   [Merger](#merger)
    -   [properties](#properties-2)
        -   [Parameters](#parameters-2)
-   [usedDevDependencies](#useddevdependencies)
    -   [Parameters](#parameters-3)
-   [Template](#template)
    -   [Parameters](#parameters-4)
    -   [Properties](#properties-3)
    -   [\_templateFrom](#_templatefrom)
        -   [Parameters](#parameters-5)
    -   [entryMergers](#entrymergers)
    -   [updateUsedBy](#updateusedby)
        -   [Parameters](#parameters-6)
    -   [templateFor](#templatefor)
        -   [Parameters](#parameters-7)
-   [ReplaceIfEmpty](#replaceifempty)
-   [Readme](#readme)
-   [MergeLineSet](#mergelineset)
-   [Replace](#replace)
-   [jspath](#jspath)
    -   [Parameters](#parameters-8)

## Context

**Extends LogLevelMixin(class \_Context {})**

context prepared to execute one package

### Parameters

-   `provider`  
-   `targetBranchName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `options`   (optional, default `{}`)

### Properties

-   `ctx` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `files` **[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** 

### executeBranch

Returns **\[[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;PullRequest>]** 

## sortedKeys

order in which json keys are written

## Package

**Extends Merger**

Merger for package.json

### properties

Deliver some key properties

#### Parameters

-   `entry` **ContentEntry** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## Merger

Mergable content

### properties

Deliver some key properties

#### Parameters

-   `entry` **ContentEntry** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## usedDevDependencies

all used dev modules

### Parameters

-   `mergers`  
-   `branch` **Branch** 

Returns **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

## Template

**Extends LogLevelMixin(class {})**

### Parameters

-   `context` **Conext** 
-   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)

### Properties

-   `context` **Conext** 
-   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 
-   `mergers` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** 
-   `branches` **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;Branch>** all used branches direct and inherited
-   `initialBranches` **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;Branch>** root branches used to define the template

### \_templateFrom

load all templates and collects the files

#### Parameters

-   `sources` **([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \| [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))** repo nmae or package content
-   `inheritencePath` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** who was requesting us (optional, default `[]`)

### entryMergers

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

### updateUsedBy

Updates usedBy section of the template branch

#### Parameters

-   `targetBranch` **Branch** template to be updated
-   `templateSources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** original branch identifiers (even with deleteion hints)

### templateFor

Remove duplicate sources
sources staring wit '-' will be removed

#### Parameters

-   `context` **[Context](#context)** 
-   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## ReplaceIfEmpty

**Extends Merger**

Overwrites none existing entries from template

## Readme

**Extends Merger**

injects badges into README.md

## MergeLineSet

**Extends Merger**

## Replace

**Extends Merger**

Replace file from template (always)

## jspath

### Parameters

-   `object`  
-   `path`  
-   `cb`  

# install

With [npm](http://npmjs.org) do:

```shell
npm install -g npm-template-sync

# npm-template-sync --help
```

# license

BSD-2-Clause
