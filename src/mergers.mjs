import { Package } from "./package.mjs";
import { Travis } from "./travis.mjs";
import { Readme } from "./readme.mjs";
import { Rollup } from "./rollup.mjs";
import { Markdown } from "./markdown.mjs";
import { License } from "./license.mjs";
import { MergeAndRemoveLineSet } from "./merge-and-remove-line-set.mjs";
import { MergeLineSet } from "./merge-line-set.mjs";
import { NpmIgnore } from "./npm-ignore.mjs";
import { ReplaceIfEmpty } from "./replace-if-empty.mjs";
import { Replace } from "./replace.mjs";
import { TOML } from "./toml.mjs";
import { INI } from "./ini.mjs";
import { YAML } from "./yaml.mjs";
import { JSONFile } from "./json-file.mjs";
import { JSDoc } from "./jsdoc.mjs";

export const mergers = [
  TOML,
  INI,
  YAML,
  Markdown,
  Rollup,
  Travis,
  Readme,
  Package,
  JSONFile,
  JSDoc,
  Travis,
  MergeAndRemoveLineSet,
  MergeLineSet,
  NpmIgnore,
  License,
  ReplaceIfEmpty,
  Replace
];
