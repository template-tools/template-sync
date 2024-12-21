[![npm](https://img.shields.io/npm/v/@template-tools/template-sync.svg)](https://www.npmjs.com/package/@template-tools/template-sync)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://spdx.org/licenses/0BSD.html)
[![bundlejs](https://deno.bundlejs.com/?q=@template-tools/template-sync\&badge=detailed)](https://bundlejs.com/?q=@template-tools/template-sync)
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

This is the engine for cli operation please see [template-tools/template-sync-cli](https://github.com/template-tools/template-sync-cli)

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
*   [Merger](#merger)
    *   [properties](#properties)
        *   [Parameters](#parameters)
    *   [commits](#commits)
        *   [Parameters](#parameters-1)
*   [normalizeTemplateSources](#normalizetemplatesources)
    *   [Parameters](#parameters-2)
*   [jspath](#jspath)
    *   [Parameters](#parameters-3)
*   [actions2message](#actions2message)
    *   [Parameters](#parameters-4)
*   [actions2messages](#actions2messages)
    *   [Parameters](#parameters-5)
*   [MergeLineSet](#mergelineset)
*   [sortedKeys](#sortedkeys)
*   [exportsConditionOrder](#exportsconditionorder)
*   [Package](#package)
    *   [properties](#properties-1)
        *   [Parameters](#parameters-6)
*   [Readme](#readme)
*   [ReplaceIfEmpty](#replaceifempty)
*   [Replace](#replace)
*   [Skip](#skip)

## Delete

**Extends Merger**

Delete entry.

## INI

**Extends Merger**

Merge ini entries

## Merger

Mergable content

### properties

Deliver some key properties.

#### Parameters

*   `entry` **ContentEntry**&#x20;

Returns **[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)** extracted properties

### commits

Generate commits as result of merging two entries.

#### Parameters

*   `context` &#x20;
*   `destinationEntry` &#x20;
*   `sourceEntry` &#x20;
*   `options` &#x20;

## normalizeTemplateSources

Remove duplicate sources.
Sources staring with '-' will be removed

### Parameters

*   `sources` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**&#x20;
*   `remove` **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>**  (optional, default `[]`)

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)>** normalized sources

## jspath

### Parameters

*   `object` &#x20;
*   `path` &#x20;
*   `cb` &#x20;

## actions2message

### Parameters

*   `actions` &#x20;
*   `prefix` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

Returns **any** actions as one string lines ordered by scope

## actions2messages

### Parameters

*   `actions` &#x20;
*   `prefix` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;
*   `name` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)**&#x20;

## MergeLineSet

**Extends Merger**

## sortedKeys

order in which json keys are written

## exportsConditionOrder

*   **See**: {<https://nodejs.org/dist/latest/docs/api/packages.html#exports}>

Order in which exports are searched

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

*   `entry` **ContentEntry**&#x20;

Returns **[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)>**&#x20;

## Readme

**Extends Merger**

Injects badges into README.md.

## ReplaceIfEmpty

**Extends Merger**

Overwrites none existing entries from template.

## Replace

**Extends Merger**

Always overwrite entry from template

## Skip

**Extends Merger**

Does not generate destination entry

# install

With [npm](http://npmjs.org) do:

```shell
npm install -g @template-tools/sync-cli
```

# license

BSD-2-Clause
