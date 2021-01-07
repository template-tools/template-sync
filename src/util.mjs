import { isScalar } from "hinted-tree-merger";

export const defaultEncodingOptions = { encoding: "utf8" };

export function asArray(o) {
  return Array.isArray(o) ? o : o === undefined ? [] : [o];
}

export function asScalar(o) {
  return Array.isArray(o) && o.length === 1 ? o[0] : o;
}

/**
 * Remove duplicate sources.
 * Sources staring with '-' will be removed
 * @param {string[]} sources
 * @param {string[]} remove
 * @return {string[]} normalized sources
 */
export function normalizeTemplateSources(sources, remove = []) {
  sources = [...new Set(asArray(sources))];
  remove = [...remove, ...sources.filter(s => s[0] === "-").map(s => s.slice(1))];
  return sources
    .filter(s => remove.indexOf(s) < 0)
    .filter(s => s[0] !== "-")
    .sort();
}

/**
 *
 */
export function jspath(object, path, cb) {
  let parts = path.split(".");

  parts = parts.reduce((a, c) => {
    const m = c.match(/^(\w+)\['(.+)'\]$/);
    return m ? [...a, m[1], m[2]] : [...a, c];
  }, []);

  const last = parts.pop();

  for (const p of parts) {
    if (p === "$") {
      continue;
    }

    const n = object[p];
    if (n === undefined) {
      return undefined;
    }
    object = n;
  }

  if (cb !== undefined) {
    cb(object[last], value => {
      object[last] = value;
    });
  }

  return object[last];
}

export function actions2message(actions, prefix, name) {
  return actions2messages(actions, prefix, name).join("\n");
}

export function actions2messages(actions, prefix, name) {
  const messages = Object.entries(actions).map(([slot, action]) => {
    const toValue = s => (s !== undefined && isScalar(s) ? s : undefined);
    const verbs = ["add", "remove", "update"]
      .map(verb => [
        verb,
        action.map(x => toValue(x[verb])).filter(x => x !== undefined)
      ])
      .filter(([name, value]) => value.length > 0)
      .map(([name, value]) => `${name} ${value}`);

    verbs.push(`(${slot.replace(/\[\d*\]/, "")})`);

    const a = action.reduce((a, c) => Object.assign(a, c), { type: "chore" });

    if (a.type) {
      prefix = a.type;
      if (a.scope) {
        prefix += `(${a.scope})`;
      }
      prefix += ": ";
    }

    return prefix + verbs.join(" ");
  });

  return messages.length === 0
    ? [`${prefix}merge from template ${name}`]
    : messages;
}

export function aggregateActions(actions, action, hint) {
  if (hint) {
    for (const key of ["type", "scope"]) {
      if (hint[key]) {
        action[key] = hint[key];
      }
    }
  }

  if (actions[action.path] === undefined) {
    actions[action.path] = [action];
  } else {
    actions[action.path].push(action);
  }
  delete action.path;
}
