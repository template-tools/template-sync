## Travis merger

a specialized yaml merger


# usage

Put the following merge into your template

```json
{
  "template": {
    "mergers": [
      {
        "merger": "Travis",
        "pattern": ".travis.yml"
      }]
}
```

# hints
the following hints are used

```json
       {
        "*": { "scope": "travis", "removeEmpty": true },
        "": {
          "orderBy": [
            "dist",
            "os",
            "language",
            "addons",
            "python",
            "php",
            "rvm",
            "node_js",
            "env",
            "install",
            "jobs",
            "before_script",
            "after_script",
            "script",
            "branches",
            "notifications"
          ]
        },
        "*node_js": { "merge": "mergeVersionsPreferNumeric" },
        "jobs.include": {
          "key": "stage",
          "orderBy": ["test", "doc", "release"]
        }
      }
```

# example


## template 1
```yaml
jobs:
  include:
    - stage: test
      script:
        - npm run cover
        - npx codecov
        - cat ./build/coverage/lcov.info | npx coveralls
```

## template 2
```yaml
jobs:
  include:
    - stage: test
      node_js:
        - 13.8.0
```

## result
```yaml
jobs:
  include:
    - stage: test
      script:
        - npm run cover
        - npx codecov
        - cat ./build/coverage/lcov.info | npx coveralls
      node_js:
        - 13.8.0
```
