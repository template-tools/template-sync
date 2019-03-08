import { File } from "./file";
import { compareVersion, asArray } from "./util";
import yaml from "js-yaml";

function difference(a, b) {
  return new Set([...a].filter(x => !b.has(x)));
}

function pathMessage(path, direction = "to") {
  return path.length > 0 ? ` ${direction} ` + path.join(".") : "";
}

export function mergeScripts(a, b, path, messages) {
  return mergeArrays(a, b, path, messages);
}

export function mergeArrays(a, b, path = [], messages = []) {
  if (a === undefined) {
  } else {
    a = asArray(a);
  }

  if (b === undefined) {
    return a;
  }

  b = asArray(b);

  for (const s of b) {
    if (s[0] === "-") {
      if (a !== undefined) {
        const t = s.substring(1);
        const i = a.indexOf(t);
        if (i >= 0) {
          a.splice(i,1);
          messages.push(
            `chore(travis): remove ${t}${pathMessage(path, "from")}`
          );
        }
      }
    } else {
      if (a === undefined) {
        a = [];
      }

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
  after_script: mergeScripts,
  "branches.only": mergeArrays,
  "notifications.email": mergeArrays,
  "jobs.include.stage": mergeArrays
};

export function merge(a, b, path = [], messages = []) {
  const location = path.join(".");

  if (slots[location] !== undefined) {
    return slots[location](a, b, path, messages);
  }

  if (a === undefined) {
    messages.push(`chore(travis): ${location}=${b}`);
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
    if (Array.isArray(b) && location !== "jobs.include") {
      const r = [...a];
      for (const x of b) {
        if (typeof x === "string" && x.startsWith("-")) {
          const d = x.replace(/^\-\s*/, "");
          const i = r.indexOf(d);

          if (i >= 0) {
            messages.push(`chore(travis): remove ${d} from ${location}`);
            r.splice(i, 1);
          }
        } else {
          messages.push(`chore(travis): add ${x} to ${location}`);
          r.push(x);
        }
      }

      return r;
    }

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

export class Travis extends File {
  static matchesFileName(name) {
    return name === ".travis.yml";
  }

  async mergeContent(context, original, template) {
    const ymlOptions = { schema: yaml.FAILSAFE_SCHEMA };

    const messages = [];

    const content = yaml.safeDump(
      merge(
        yaml.safeLoad(original, ymlOptions) || {},
        yaml.safeLoad(context.expand(template), ymlOptions),
        undefined,
        messages
      ),
      {
        lineWidth: 128
      }
    );

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
