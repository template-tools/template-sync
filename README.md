[![npm](https://img.shields.io/npm/v/@template-tools/template-sync.svg)](https://www.npmjs.com/package/@template-tools/template-sync)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![Open Bundle](https://bundlejs.com/badge-light.svg)](https://bundlejs.com/?q=@template-tools/template-sync)
[![downloads](http://img.shields.io/npm/dm/@template-tools/template-sync.svg?style=flat-square)](https://npmjs.org/package/@template-tools/template-sync)
[![GitHub Issues](https://img.shields.io/github/issues/template-tools/template-sync.svg?style=flat-square)](https://github.com/template-tools/template-sync/issues)
[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Ftemplate-tools%2Ftemplate-sync%2Fbadge\&style=flat)](https://actions-badge.atrox.dev/template-tools/template-sync/goto)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/template-tools/template-sync/badge.svg)](https://snyk.io/test/github/template-tools/template-sync)
[![Coverage Status](https://coveralls.io/repos/template-tools/template-sync/badge.svg)](https://coveralls.io/github/template-tools/template-sync)

## template-sync

Keep repository in sync with its template.

Generates pull requests to bring a repository back in sync with its template.

So by making changes to the template and applying template-sync the target project will be updated accoring to the template.

Works with github and bitbucket.

```shell
export GITHUB_TOKEN='token providing repositroy write access' # for github repos

template-sync --template aTemplateGithubUser/aRepo myGithubUser/myRepo
```

Define (initial) properties to be used in the template

```shell
export GITHUB_TOKEN='token providing repositroy write access' # for github repos

template-sync --define "description=a very new fantastic module" -t myUser/myTemplate myUser/newModule#aBranch
```

Create new repository and bind it to aTemplateGithubUser/aRepo

```shell
export GITHUB_TOKEN='token providing repositroy write access' # for github repos

template-sync --track --create --template aTemplateGithubUser/aRepo myGithubUser/myRepo
```

Switch from [arlac77/template-github](https://github.com/arlac77/template-github) to [arlac77/template-arlac77-github](https://github.com/arlac77/template-arlac77-github) template for [arlac77/url-cmd](https://github.com/arlac77/url-cmd), [arlac77/uti](https://github.com/arlac77/uti), [arlac77/content-entry](https://github.com/arlac77/content-entry) and [arlac77/repository-provider](https://github.com/arlac77/repository-provider)

```shell
export GITHUB_TOKEN='token providing repositroy write access' # for github repos

template-sync --track --template arlac77/template-arlac77-github --template -arlac77/template-github arlac77/url-cmd arlac77/uti arlac77/content-entry arlac77/repository-provider
```

Merges contents from template branch into destination branch handling some special cases for:

*   Licenses - rewriting license years
*   line set files like .npmignore and .gitignore - by merging both sets together
*   package.json - merge (.\*)\[Dd]ependencies, engines and scripts
*   rollup.conf.\*js - copy / rewrite + detect dev dependencies
*   [\*.yaml - merge](doc/yaml/README.md)
*   [.travis.yml - merge with hints](doc/travis/README.md)
*   [\*.toml - merge](doc/toml/README.md)
*   [\*.ini - merge](doc/ini/README.md)
*   [\*.json - merge](doc/json/README.md)
*   README.md - merge badges

![generated pull request](doc/pr_sample.png)

## Some templates

*   [arlac77/template-cli-app](https://github.com/arlac77/template-cli-app) *rollup* *ava* *travis*
*   [arlac77/template-esm-only](https://github.com/arlac77/template-esm-only) *ava* *travis*
*   [arlac77/template-svelte-component](https://github.com/arlac77/template-svelte-component) *svelte* *rollup* *testcafe* *travis*
*   [arlac77/template-svelte-app](https://github.com/arlac77/template-svelte-app) *svelte* *rollup* *pkgbuild* *travis*
*   [arlac77/template-kronos-component](https://github.com/arlac77/template-kronos-component) template-esm-only with node 14
*   [arlac77/template-kronos-app](https://github.com/arlac77/template-kronos-app) node 14 + systemd

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [Delete](#delete)
*   [INI](#ini)
*   [normalizeTemplateSources](#normalizetemplatesources)
    *   [Parameters](#parameters)
*   [jspath](#jspath)
    *   [Parameters](#parameters-1)
*   [actions2message](#actions2message)
    *   [Parameters](#parameters-2)
*   [actions2messages](#actions2messages)
    *   [Parameters](#parameters-3)
*   [MergeLineSet](#mergelineset)
*   [sortedKeys](#sortedkeys)
*   [Package](#package)
    *   [properties](#properties)
        *   [Parameters](#parameters-4)
*   [Readme](#readme)
*   [ReplaceIfEmpty](#replaceifempty)
*   [Replace](#replace)
*   [Merger](#merger)
    *   [properties](#properties-1)
        *   [Parameters](#parameters-5)
    *   [commits](#commits)
        *   [Parameters](#parameters-6)
*   [Skip](#skip)

## Delete

**Extends Merger**

Delete entry.

## INI

**Extends Merger**

Merge ini entries

## normalizeTemplateSources

Remove duplicate sources.
Sources staring with '-' will be removed

### Parameters

*   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** 
*   `remove` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**  (optional, default `[]`)

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** normalized sources

## jspath

### Parameters

*   `object`  
*   `path`  
*   `cb`  

## actions2message

### Parameters

*   `actions`  
*   `prefix` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **any** actions as one string lines ordered by scope

## actions2messages

### Parameters

*   `actions`  
*   `prefix` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 
*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** 

## MergeLineSet

**Extends Merger**

## sortedKeys

order in which json keys are written

## Package

**Extends Merger**

Merger for package.json

### properties

Deliver some key properties.

*   name
*   version
*   description
*   main

#### Parameters

*   `entry` **ContentEntry** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** 

## Readme

**Extends Merger**

Injects badges into README.md.

## ReplaceIfEmpty

**Extends Merger**

Overwrites none existing entries from template.

## Replace

**Extends Merger**

Always overwrite entry from template

## Merger

Mergable content

### properties

Deliver some key properties.

#### Parameters

*   `entry` **ContentEntry** 

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** extracted properties

### commits

Generate commits as result of merging two entries.

#### Parameters

*   `context`  
*   `destinationEntry`  
*   `sourceEntry`  
*   `options`  

## Skip

**Extends Merger**

Does not generate destination entry

# install

With [npm](http://npmjs.org) do:

```shell
npm install -g @template-tools/sync-cli

# template-sync --help
```

# license

BSD-2-Clause
