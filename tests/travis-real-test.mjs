import test from "ava";
import yaml from "js-yaml";
import { MockProvider } from "mock-repository-provider";
import { Context } from "../src/context.mjs";
import { PreparedContext } from "../src/prepared-context.mjs";
import { Travis } from "../src/travis.mjs";

async function travisMerge(original, template) {
  const provider = new MockProvider({
    templateRepo: {
      master: {
        aFile: yaml.safeDump(template)
      }
    },
    targetRepo: {
      master: {
        aFile: yaml.safeDump(original)
      }
    }
  });

  const context = await PreparedContext.from(
    new Context(provider, {
      templateBranchName: "templateRepo"
    }),
    "targetRepo"
  );

  const merger = new Travis("aFile");
  return await merger.merge(context);
}

test("travis real merge", async t => {
  const merged = await travisMerge(
    {
      language: "node_js",
      node_js: ["10.15.3", "11.11.0"],
      cache: "npm",
      script: ["npm run cover"],
      branches: { only: ["master", "/^greenkeeper/.*$/"] },
      jobs: {
        include: [
          {
            stage: "docs",
            node_js: "lts/*",
            skip_cleanup: "true",
            script: [
              "npm install -g --production coveralls codecov",
              "npm run cover",
              "codecov",
              "cat ./coverage/lcov.info | coveralls",
              "npm run lint",
              "npm run docs"
            ]
          },
          {
            stage: "release",
            node_js: "lts/*",
            script: "skip",
            deploy: {
              provider: "script",
              skip_cleanup: "true",
              script: ["npx semantic-release"]
            }
          }
        ]
      }
    },
    {
      language: "node_js",
      node_js: ["-10", "-11", "10.15.3", "11.12.0"],
      script: ["npm run cover", "-npm run lint", "-npm run docs"],
      jobs: {
        include: [
          {
            stage: "docs",
            node_js: "lts/*",
            skip_cleanup: "true",
            script: [
              "-npm install -g --production coveralls codecov",
              "-cat ./coverage/lcov.info | coveralls",
              "npm install -g --production codecov",
              "npm run cover",
              "codecov",
              "npm run lint",
              "npm run docs"
            ]
          },
          {
            stage: "release",
            node_js: "lts/*",
            script: "skip",
            deploy: {
              provider: "script",
              skip_cleanup: "true",
              script: ["npx semantic-release"]
            }
          }
        ]
      },
      cache: "npm",
      before_script: [
        "-npm prune",
        "-npm install -g --production coveralls codecov"
      ],
      after_script: ["-codecov", "-cat ./coverage/lcov.info | coveralls"],
      after_success: [
        '-npm run travis-deploy-once "npm run semantic-release"',
        "-npm run semantic-release"
      ]
      //   notifications: { email: ["-markus.felten@gmx.de"] }
    }
  );

  t.log(merged.content);
  t.log(merged.messages);
  t.deepEqual(yaml.safeLoad(merged.content), {
    language: "node_js",
    node_js: ["10.15.3", "11.12.0"],
    cache: "npm",
    script: ["npm run cover"],
    branches: { only: ["master", "/^greenkeeper/.*$/"] },
    jobs: {
      include: [
        {
          stage: "docs",
          node_js: "lts/*",
          skip_cleanup: "true",
          script: [
            "npm install -g --production codecov",
            "npm run cover",
            "codecov",
            "npm run lint",
            "npm run docs"
          ]
        },
        {
          stage: "release",
          node_js: "lts/*",
          script: "skip",
          deploy: {
            provider: "script",
            skip_cleanup: "true",
            script: ["npx semantic-release"]
          }
        }
      ]
    }
  });

});
