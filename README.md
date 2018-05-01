[![npm](https://img.shields.io/npm/v/npm-template-sync.svg)](https://www.npmjs.com/package/npm-template-sync)
[![Greenkeeper](https://badges.greenkeeper.io/arlac77/npm-template-sync.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/arlac77/npm-template-sync)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Build Status](https://secure.travis-ci.org/arlac77/npm-template-sync.png)](http://travis-ci.org/arlac77/npm-template-sync)
[![codecov.io](http://codecov.io/github/arlac77/npm-template-sync/coverage.svg?branch=master)](http://codecov.io/github/arlac77/npm-template-sync?branch=master)
[![Coverage Status](https://coveralls.io/repos/arlac77/npm-template-sync/badge.svg)](https://coveralls.io/r/arlac77/npm-template-sync)
[![Known Vulnerabilities](https://snyk.io/test/github/arlac77/npm-template-sync/badge.svg)](https://snyk.io/test/github/arlac77/npm-template-sync)
[![GitHub Issues](https://img.shields.io/github/issues/arlac77/npm-template-sync.svg?style=flat-square)](https://github.com/arlac77/npm-template-sync/issues)
[![Stories in Ready](https://badge.waffle.io/arlac77/npm-template-sync.svg?label=ready&title=Ready)](http://waffle.io/arlac77/npm-template-sync)
[![Dependency Status](https://david-dm.org/arlac77/npm-template-sync.svg)](https://david-dm.org/arlac77/npm-template-sync)
[![devDependency Status](https://david-dm.org/arlac77/npm-template-sync/dev-status.svg)](https://david-dm.org/arlac77/npm-template-sync#info=devDependencies)
[![docs](http://inch-ci.org/github/arlac77/npm-template-sync.svg?branch=master)](http://inch-ci.org/github/arlac77/npm-template-sync)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![downloads](http://img.shields.io/npm/dm/npm-template-sync.svg?style=flat-square)](https://npmjs.org/package/npm-template-sync)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

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
-   package.json - merge devDependencies, engines and scripts
-   rollup.conf.js - copy / rewrite

![generated pull request](doc/pr_sample.png)

## Some templates

-   [list by _npm-package-template_ keyword](https://www.npmjs.com/browse/keyword/npm-package-template)
-   [arlac77 npm-package-template](https://github.com/arlac77/npm-package-template) _rollup_ _ava_
-   [Kronos-Tools npm-package-template](https://github.com/Kronos-Tools/npm-package-template) _mocha_
-   [Kronos-Tools npm-package-template-minimal](https://github.com/Kronos-Tools/npm-package-template-minimal)

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [npmTemplateSync](#npmtemplatesync)
-   [Context](#context)
    -   [usedDevModules](#useddevmodules)
-   [File](#file)
-   [Readme](#readme)
-   [templateOptions](#templateoptions)
-   [sortedKeys](#sortedkeys)
-   [Package](#package)
    -   [properties](#properties)
-   [defaultMerge](#defaultmerge)
-   [MergeAndRemoveLineSet](#mergeandremovelineset)
-   [ReplaceIfEmpty](#replaceifempty)
-   [Replace](#replace)

## npmTemplateSync

**Parameters**

-   `provider` **RepositoryProvider** 
-   `targetBranch` **Branch** 
-   `templateBranch` **Branch** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `defines` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;PullRequest>** 

## Context

**Parameters**

-   `targetBranch` **Branch** 
-   `templateBranch` **Branch** 
-   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

**Properties**

-   `targetBranch` **Branch** 
-   `templateBranch` **Branch** 
-   `properties` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

### usedDevModules

all used dev modules

Returns **[Set](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)&lt;[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 

## File

**Parameters**

-   `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)**  (optional, default `{}`)

**Properties**

-   `path` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `options` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## Readme

**Extends File**

injects badges into REAMDE.md

## templateOptions

find merger options in the template section of a package.json

**Parameters**

-   `json` **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## sortedKeys

order in which json keys are written

## Package

**Extends File**

Merger for package.json

### properties

Deliver some key properties

**Parameters**

-   `context` **[Context](#context)** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## defaultMerge

**Parameters**

-   `destination`  
-   `target`  
-   `template`  
-   `category`  
-   `name`  
-   `messages`  

## MergeAndRemoveLineSet

**Extends MergeLineSet**

## ReplaceIfEmpty

**Extends File**

Overwrites none existing file from template

## Replace

**Extends File**

Replace file from template (always)

# install

With [npm](http://npmjs.org) do:

```shell
npm install -g npm-template-sync

# npm-template-sync --help
```

# license

BSD-2-Clause
