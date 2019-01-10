import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import pkg from "./package.json";

const external = [
  "os",
  "path",
  "crypto",
  "fs",
  "util",
  "url",
  "net",
  "tty",
  "stream",
  "child_process",
  "http",
  "https",
  "assert",
  "events",
  "zlib",
//  "deep-extend",
//  "simple-diff",
//  "micromatch",
//  "semver",
//  "caporal",
//  "jsonpath",
];

export default {
  output: {
    file: pkg.bin["npm-template-sync"],
    format: "cjs",
    banner:
      '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules --experimental-worker "$0" "$@"',
    interop: false
  },
  plugins: [
    resolve(),
    commonjs({
    //  ignore: [ 'string_decoder' , 'try-thread-sleep' ]
    }),
    json({
      preferConst: true,
      compact: true
    }),
    executable()
  ],
  external,
  input: "src/npm-template-sync-cli.mjs"
};
