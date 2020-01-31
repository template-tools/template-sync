[![npm](https://img.shields.io/npm/v/npm-template-sync.svg)](https://www.npmjs.com/package/npm-template-sync)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/npm-template-sync)](https://bundlephobia.com/result?p=npm-template-sync)
[![downloads](http://img.shields.io/npm/dm/npm-template-sync.svg?style=flat-square)](https://npmjs.org/package/npm-template-sync)
[![GitHub Issues](https://img.shields.io/github/issues/arlac77/npm-template-sync.svg?style=flat-square)](https://github.com/arlac77/npm-template-sync/issues)
[![Build Status](https://secure.travis-ci.org/arlac77/npm-template-sync.png)](http://travis-ci.org/arlac77/npm-template-sync)
[![codecov.io](http://codecov.io/github/arlac77/npm-template-sync/coverage.svg?branch=master)](http://codecov.io/github/arlac77/npm-template-sync?branch=master)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-template-sync/badge.svg)](https://coveralls.io/r/arlac77/npm-template-sync)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-template-sync/badge.svg)](https://snyk.io/test/github/arlac77/npm-template-sync)
[![Greenkeeper](https://badges.greenkeeper.io/arlac77/npm-template-sync.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/arlac77/npm-template-sync)

## npm-template-sync

Keep npm package in sync with its template

```shell
npm-template-sync --template aTemplateGithubUser/aRepo myGithubUser/myRepo
```

define (initial) properties to be used in the template

```shell
npm-template-sync --define "description=a very new fantastic module" -t myUser/myTemplate myUser/newModule
```

merges contents from template repo into destination repo handling some special cases for:

-   Licenses - rewriting license years
-   line set files like .npmignore and .gitignore - by merging both sets together
-   package.json - merge (.\*)[Dd]ependencies, engines and scripts
-   rollup.conf.js - copy / rewrite
-   \*.yml - merge
-   .travis.yml - merge with hints
-   \*.toml - merge
-   \*.ini - merge
-   \*.json - merge
-   README.md - merge badges

![generated pull request](doc/pr_sample.png)

## Some templates

-   [list by _npm-package-template_ keyword](https://www.npmjs.com/browse/keyword/npm-package-template)
-   [arlac77/npm-package-template](https://github.com/arlac77/npm-package-template) _rollup_ _ava_ _travis_
-   [arlac77/npm-package-template-esm-only](https://github.com/arlac77/npm-package-template) _ava_ _travis_
-   [arlac77/npm-package-template-svelte](https://github.com/arlac77/npm-package-template) _svelte_ _rollup_ _testcafe_ _travis_
-   [arlac77/npm-package-template-svelte-app](https://github.com/arlac77/npm-package-template) _svelte_ _rollup_ _pkgbuild_ _travis_
-   [Kronos-Tools/npm-package-template](https://github.com/Kronos-Tools/npm-package-template) _mocha_
-   [Kronos-Tools/npm-package-template-minimal](https://github.com/Kronos-Tools/npm-package-template-minimal)

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [Context](#context)
    -   [Parameters](#parameters)
    -   [Properties](#properties)
-   [PreparedContext](#preparedcontext)
    -   [Parameters](#parameters-1)
    -   [Properties](#properties-1)
-   [sortedKeys](#sortedkeys)
-   [Package](#package)
    -   [properties](#properties-2)
        -   [Parameters](#parameters-2)
-   [jspath](#jspath)
    -   [Parameters](#parameters-3)
-   [Template](#template)
    -   [Parameters](#parameters-4)
    -   [Properties](#properties-3)
    -   [\_templateFrom](#_templatefrom)
        -   [Parameters](#parameters-5)
    -   [mergers](#mergers)
-   [ReplaceIfEmpty](#replaceifempty)
-   [Merger](#merger)
    -   [Parameters](#parameters-6)
    -   [Properties](#properties-4)
    -   [properties](#properties-5)
        -   [Parameters](#parameters-7)
    -   [merge](#merge)
        -   [Parameters](#parameters-8)
-   [Readme](#readme)
-   [MergeAndRemoveLineSet](#mergeandremovelineset)
-   [MergeLineSet](#mergelineset)
    -   [defaultIgnoreSet](#defaultignoreset)
-   [NpmIgnore](#npmignore)
    -   [defaultIgnoreSet](#defaultignoreset-1)
-   [Replace](#replace)

## Context

### Parameters

-   `provider` **RepositoryProvider** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)

### Properties

-   `provider` **RepositoryProvider** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
    -   `options.templates` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

## PreparedContext

context prepared to execute one package

### Parameters

-   `context` **[Context](#context)** 
-   `targetBranchName` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

### Properties

-   `ctx` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `files` **[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String), [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>** 

## sortedKeys

order in which json keys are written

## Package

**Extends Merger**

Merger for package.json

### properties

Deliver some key properties

#### Parameters

-   `branch` **Branch** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## jspath

### Parameters

-   `object`  
-   `path`  
-   `cb`  

## Template

### Parameters

-   `provider` **RepositoryProvider** 
-   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

### Properties

-   `provider` **RepositoryProvider** 
-   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 
-   `branches` **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;Branch>** 
-   `initialBranches` **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;Branch>** 

### \_templateFrom

load all templates and collects the files

#### Parameters

-   `sources` **([string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String) \| [Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object))** repo nmae or package content
-   `isInitialSource`  

### mergers

## ReplaceIfEmpty

**Extends Merger**

Overwrites none existing file from template

## Merger

Mergable File

### Parameters

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** location in the repository
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** mergin options (optional, default `{}`)

### Properties

-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

### properties

Deliver some key properties

#### Parameters

-   `branch` **Branch** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

### merge

#### Parameters

-   `context` **PreparedContect** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** merged content

## Readme

**Extends Merger**

injects badges into README.md

## MergeAndRemoveLineSet

**Extends MergeLineSet**

## MergeLineSet

**Extends Merger**

File where every line is a key

### defaultIgnoreSet

entries to be skipped from result

Returns **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

## NpmIgnore

**Extends MergeAndRemoveLineSet**

### defaultIgnoreSet

-   **See: <https://docs.npmjs.com/misc/developers>**

entries to be skipped from result

Returns **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

## Replace

**Extends Merger**

Replace file from template (always)

# install

With [npm](http://npmjs.org) do:

```shell
npm install -g npm-template-sync

# npm-template-sync --help
```

# license

BSD-2-Clause
