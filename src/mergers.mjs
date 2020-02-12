import { Package } from "./mergers/package.mjs";
import { Travis } from "./mergers/travis.mjs";
import { Readme } from "./mergers/readme.mjs";
import { Rollup } from "./mergers/rollup.mjs";
import { Markdown } from "./mergers/markdown.mjs";
import { License } from "./mergers/license.mjs";
import { MergeLineSet } from "./mergers/merge-line-set.mjs";
import { NpmIgnore } from "./mergers/npm-ignore.mjs";
import { ReplaceIfEmpty } from "./mergers/replace-if-empty.mjs";
import { Replace } from "./mergers/replace.mjs";
import { TOML } from "./mergers/toml.mjs";
import { INI } from "./mergers/ini.mjs";
import { YAML } from "./mergers/yaml.mjs";
import { JSONMerger } from "./mergers/json.mjs";
import { JSDoc } from "./mergers/jsdoc.mjs";

export const mergers = [
  Travis,
  NpmIgnore,
  TOML,
  INI,
  YAML,
  Markdown,
  Rollup,
  Readme,
  Package,
  JSONMerger,
  JSDoc,
  MergeLineSet,
  License,
  ReplaceIfEmpty,
  Replace
];
