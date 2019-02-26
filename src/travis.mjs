import { File } from "./file";
import { compareVersion } from "./util";
import deepExtend from "deep-extend";
import yaml from "js-yaml";

function difference(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}

const scriptSlots = [
  "before_install",
  "install",
  "before_script",
  "script",
  "before_cache",
  "after_success",
  "after_failure",
  "before_deploy",
  "deploy",
  "after_deploy",
  "after_script"
];

const deletableSlots = ["notifications.email", "branches.only"];

export class Travis extends File {
  static matchesFileName(name) {
    return name === ".travis.yml";
  }

  async mergeContent(context, original, template) {
    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };

    const yml = yaml.safeLoad(original, ymlOptions) || {};
    const tyml = yaml.safeLoad(context.expand(template), ymlOptions);

    const savedScripts = scriptSlots.reduce((a, c) => {
      a[c] = yml[c];
      return a;
    }, {});

    const messages = [];

    const oldVersions = new Set(
      yml.node_js ? [...yml.node_js.map(s => String(s))] : []
    );
    const templateVersions = new Set(
      tyml.node_js ? [...tyml.node_js.map(s => String(s))] : []
    );
    const versions = new Set([...oldVersions, ...templateVersions]);
    const newVersions = new Set(versions);

    versions.forEach(v => {
      if (v.startsWith("-")) {
        const d = v.replace(/^\-\s*/, "");

        versions.forEach(v => {
          const x = v.replace(/^\-\s*/, "");
          if (compareVersion(d, x) === 0 || x != v) {
            if (templateVersions.has(x)) {
              return;
            }

            newVersions.delete(x);
            newVersions.delete(v);
          }
        });
      }
    });

    const r = difference(oldVersions, newVersions);
    if (r.size > 0) {
      messages.push(
        `chore(travis): remove node versions ${Array.from(new Set(r)).sort()}`
      );
    }

    const a = difference(newVersions, oldVersions);
    if (a.size > 0) {
      messages.push(
        `chore(travis): add node versions ${Array.from(new Set(a)).sort()}`
      );
    }

    deletableSlots.forEach(name => {
      const parts = name.split(/\./);

      if (tyml[parts[0]] !== undefined) {
        const v = tyml[parts[0]][parts[1]];

        if (Array.isArray(v)) {
          for (const vv of v) {
            if (vv.startsWith("-")) {
              delete tyml[parts[0]][parts[1]];

              if (Object.keys(tyml[parts[0]]).length === 0) {
                delete tyml[parts[0]];
              }
            }
          }
        }
      }
    });

    deepExtend(yml, tyml);

    if (newVersions.size > 0) {
      yml.node_js = Array.from(new Set(newVersions))
        .sort()
        .map(s => (String(parseFloat(s)) == s ? parseFloat(s) : s));
    }

    scriptSlots.forEach(scriptName => {
      const cs = savedScripts[scriptName];

      if (cs !== undefined) {
        cs.forEach(s => {
          if (!yml[scriptName].find(e => e === s)) {
            yml[scriptName].push(s);
          }
        });
      }

      if (yml[scriptName]) {
        yml[scriptName] = yml[scriptName].filter(
          s =>
            !tyml[scriptName].find(e => e === `-${s}`) && s.indexOf("-") !== 0
        );
        if (Array.isArray(yml[scriptName]) && yml[scriptName].length === 0) {
          delete yml[scriptName];
        }
      }
    });

    Object.keys(yml).forEach(name => {
      if (yml[name] === "--delete--") {
        delete yml[name];
      }
    });

    const content = yaml.safeDump(yml, {
      lineWidth: 128
    });

    if (messages.length === 0) {
      messages.push(`chore(travis): merge from template ${this.name}`);
    }

    return {
      content,
      changed: content !== original,
      messages
    };
  }
}
