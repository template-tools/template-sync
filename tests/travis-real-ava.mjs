import test from "ava";
import { Travis } from "../src/mergers/travis.mjs";
import { yamlt } from "./helpers/util.mjs";

test(
  "travis real merge",
  yamlt,
  Travis,
  {
    language: "node_js",
    node_js: ["-10", "-11", "10.15.3", "11.12.0"],
    script: ["npm run cover", "-npm run lint", "-npm run docs"],
    jobs: {
      include: [
        {
          stage: "doc",
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
    cache: "--delete-- npm",
    before_script: [
      "-npm prune",
      "-npm install -g --production coveralls codecov"
    ],
    after_script: ["-codecov", "-cat ./coverage/lcov.info | coveralls"],
    after_success: [
      '-npm run travis-deploy-once "npm run semantic-release"',
      "-npm run semantic-release"
    ]
  },
  {
    language: "node_js",
    node_js: ["10.15.3", "11.11.0"],
    script: ["npm run cover"],
    branches: { only: ["master", "/^greenkeeper/.*$/"] },
    jobs: {
      include: [
        {
          stage: "doc",
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
  undefined,
  undefined,
  {
    language: "node_js",
    node_js: ["10.15.3", "11.12.0"],
    script: ["npm run cover"],
    branches: { only: ["master", "/^greenkeeper/.*$/"] },
    jobs: {
      include: [
        {
          stage: "doc",
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
  }
);
