import { File } from "./file";
import { compareVersion, asArray } from "./util";
import deepExtend from "deep-extend";
import yaml from "js-yaml";

function difference(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}

function pathMessage(path, direction = "to") {
  return path.length > 0 ? ` ${direction} ` + path.join(".") : "";
}

export function mergeScripts(a, b, path = [], messages = []) {
  if (a === undefined) {
    a = [];
  } else {
    a = asArray(a);
  }

  b = asArray(b);

  for (const s of b) {
    if (s[0] === "-") {
      const t = s.substring(1);
      const i = a.indexOf(t);
      if (i >= 0) {
        a.splice(i);
        messages.push(`chore(travis): remove ${t}${pathMessage(path, "from")}`);
      }
    } else {
      if (a.indexOf(s) < 0) {
        a.push(s);
        messages.push(`chore(travis): add ${s}${pathMessage(path)}`);
      }
    }
  }

  return a;
}

export function mergeVersions(a, b, path = [], messages = []) {
  const aVersions = new Set(a ? [...a.map(s => String(s))] : []);
  const bVersions = new Set(b ? [...b.map(s => String(s))] : []);

  const versions = new Set([...aVersions, ...bVersions]);
  const newVersions = new Set(versions);

  versions.forEach(v => {
    if (v.startsWith("-")) {
      const d = v.replace(/^\-\s*/, "");

      versions.forEach(v => {
        const x = v.replace(/^\-\s*/, "");
        if (compareVersion(d, x) === 0 || x != v) {
          if (bVersions.has(x)) {
            return;
          }

          newVersions.delete(x);
          newVersions.delete(v);
        }
      });
    }
  });

  const r = difference(aVersions, bVersions);
  if (r.size > 0) {
    messages.push(
      `chore(travis): remove node versions ${Array.from(new Set(r)).sort()}`
    );
  }

  const as = difference(bVersions, aVersions);
  if (as.size > 0) {
    messages.push(
      `chore(travis): add node versions ${Array.from(new Set(as)).sort()}`
    );
  }

  if (newVersions.size > 0) {
    return Array.from(new Set(newVersions))
      .sort()
      .map(s => (String(parseFloat(s)) == s ? parseFloat(s) : s));
  }

  return [];
}

const slots = {
  node_js: mergeVersions,
  before_install: mergeScripts,
  install: mergeScripts,
  before_script: mergeScripts,
  script: mergeScripts,
  before_cache: mergeScripts,
  after_success: mergeScripts,
  after_failure: mergeScripts,
  before_deploy: mergeScripts,
  deploy: mergeScripts,
  after_deploy: mergeScripts,
  after_script: mergeScripts
};

export function merge(a, b, path = [], messages = []) {
  //console.log("WALK", path.join("."), a, '<>', b);

  if (a === undefined) {
    messages.push(`chore(travis): ${path.join(".")}=${b}`);
    return b;
  }

  if (b === undefined) {
    return a;
  }

  if (
    typeof a === "string" ||
    a instanceof String ||
    typeof a === "number" ||
    a instanceof Number
  ) {
    if (b !== undefined) {
      return b;
    }

    return a;
  }

  if (Array.isArray(a)) {
    return a;
  }

  const r = {};

  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (b[key] !== "--delete--") {
      const v = (slots[key] ? slots[key] : merge)(
        a[key],
        b[key],
        [...path, key],
        messages
      );

      if (v !== undefined) {
        if (Array.isArray(v) && v.length === 0) {
        } else {
          r[key] = v;
        }
      }
    }
  }

  return r;
}

const deletableSlots = ["notifications.email", "branches.only"];

export class Travis extends File {
  static matchesFileName(name) {
    return name === ".travis.yml";
  }

  async mergeContent(context, original, template) {
    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };

    let yml = yaml.safeLoad(original, ymlOptions) || {};
    const tyml = yaml.safeLoad(context.expand(template), ymlOptions);

    const messages = [];

    yml = merge(yml, tyml, undefined, messages);

    /*
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
*/

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
