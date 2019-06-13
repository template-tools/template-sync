import builtins from "builtin-modules";
import cleanup from "rollup-plugin-cleanup";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import json from "rollup-plugin-json";
import pkg from "./package.json";

const external = [
  ...builtins,

  "node-fetch"
];

export default {
  output: {
    file: pkg.bin["npm-template-sync"],
    format: "cjs",
    banner:
      '#!/bin/sh\n":" //# comment; exec /usr/bin/env node --experimental-modules "$0" "$@"',
    interop: false
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json({
      preferConst: true,
      compact: true
    }),
    cleanup({
      extensions: ["js", "mjs", "jsx", "tag"],
      exclude: ["node_modules/@octokit/plugin-throttling/lib/route-matcher.js"]
    }),
    executable()
  ],
  external,
  input: "src/npm-template-sync-cli.mjs"
};
