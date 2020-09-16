## INI merger

a ini file merger


# usage

Put the following merge into your template

```json
{
  "template": {
    "mergers": [
      {
        "merger": "INI",
        "pattern": "*.ini"
      }]
}
```

# example ordering keys in systemd service files

```json
{
  "template": {
    "mergers": [
      {
        "type": "INI",
        "pattern": "**/*.service",
        "mergeHints": {
            "*": {
              "overwrite": false
            },
            "Unit": {
              "orderBy": [
                "Description",
                "AssertUser",
                "AssertGroup",
                "AssertControlGroupController"
              ]
            }
          }
      }]
}
```
