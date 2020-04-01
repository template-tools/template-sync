import test from "ava";
import { StringContentEntry } from "content-entry";
import { Rollup } from "../src/mergers/rollup.mjs";

async function rudt(t, content, dependencies) {
  t.deepEqual(
    await Rollup.usedDevDependencies(
      new StringContentEntry("rolloup.config.mjs", content)
    ),
    new Set(dependencies)
  );
}

rudt.title = (providedTitle = "", content, dependencies) =>
  `rollup used dependencies ${providedTitle} ${content.slice(
    50
  )} ${dependencies}`.trim();

test(
  rudt,
  `import babel from 'rollup-plugin-babel';
  import multiEntry from 'rollup-plugin-multi-entry';
  import resolve from "@rollup/plugin-node-resolve";

  export default {
    entry: 'tests/**/*-test.js',
    external: ['ava', 'expression-expander'],
    plugins: [
      resolve(),
      babel({
        babelrc: false,
        exclude: 'node_modules/**'
      }),
      multiEntry()
    ],
    format: 'cjs',
    dest: 'build/test-bundle.js',
    sourceMap: true
  };`,
  [
    "rollup-plugin-babel",
    "rollup-plugin-multi-entry",
    "@rollup/plugin-node-resolve"
  ]
);

test(
  rudt,
  `import resolve from "@rollup/plugin-node-resolve";
  import commonjs from "@rollup/plugin-commonjs";
  
  import svelte from "rollup-plugin-svelte";
  import { terser } from "rollup-plugin-terser";
  import dev from "rollup-plugin-dev";
  import copy from "rollup-plugin-copy";
  import consts from "rollup-plugin-consts";
  import { name, description, version, config } from "./package.json";
  
  const production = !process.env.ROLLUP_WATCH;
  const dist = "public";
  const port = 5000;
  
  export default {
    input: "src/main.mjs",
    output: {
      sourcemap: true,
      format: "esm",
      file: \`\${dist}/bundle.mjs\`
    },
    plugins: [
      consts({
        name,
        version,
        description,
        ...config
      }),
      copy({
        targets: [{ src: "node_modules/mf-styling/global.css", dest: dist }]
      }),
      svelte({
        dev: !production,
        css: css => {
          css.write(\`\${dist}/bundle.css\`);
        }
      }),
      resolve({ browser: true }),
      commonjs(),
      production && terser(),
      dev({
        port,
        dirs: [dist],
        spa: \`\${dist}/index.html\`,
        basePath: config.base,
        proxy: { [\`\${config.api}/*\`]: [config.proxyTarget, { https: true }] }
      })
    ],
    watch: {
      clearScreen: false
    }
  };`,
  [
    "@rollup/plugin-node-resolve",
    "@rollup/plugin-commonjs",
    "rollup-plugin-svelte",
    "rollup-plugin-terser",
    "rollup-plugin-dev",
    "rollup-plugin-copy",
    "rollup-plugin-consts",
    "./package.json"
  ]
);

test("rollup optional dev modules", t => {
  t.deepEqual(
    Rollup.optionalDevDependencies(
      new Set([
        "a",
        "rollup-plugin-1",
        "babel-preset-xyz",
        "@rollup/plugin-commonjs"
      ])
    ),
    new Set(["rollup-plugin-1", "babel-preset-xyz", "@rollup/plugin-commonjs"])
  );
});
