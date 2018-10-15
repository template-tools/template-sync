export async function getPassword(options) {
  const [account, service] = options.keystore.split(/\//);

  try {
    const { getPassword } = require("keytar");
    return getPassword(account, service);
  } catch (e) {}
  return undefined;
}

export async function setPassword(pasword, options) {
  const [account, service] = options.keystore.split(/\//);
  try {
    const { setPassword } = require("keytar");
    setPassword(account, service, password);
  } catch (e) {}

  return password;
}

/**
 * find merger options in the template section of a package.json
 * @param {Object} json
 * @param {string} name
 * @return {Object}
 */
export function templateOptions(json, name) {
  if (json.template !== undefined && json.template.files !== undefined) {
    const m = json.template.files.find(f => f.merger === name);
    if (m !== undefined && m.options !== undefined) {
      return m.options;
    }
  }
  return {};
}

export function setProperty(properties, attributePath, value) {
  const m = attributePath.match(/^(\w+)\.(.*)/);

  if (m) {
    const key = m[1];
    if (properties[key] === undefined) {
      properties[key] = {};
    }
    setProperty(properties[key], m[2], value);
  } else {
    properties[attributePath] = value;
  }
}

export function removeSensibleValues(object) {
  if (
    object === undefined ||
    object === null ||
    typeof object === "number" ||
    typeof object === "string" ||
    object instanceof String
  ) {
    return object;
  }

  const result = {};
  for (const key of Object.keys(object)) {
    const value = object[key];

    if (typeof value === "string" || value instanceof String) {
      if (key.match(/pass|auth|key|user/)) {
        result[key] = "...";
        continue;
      }
    }

    result[key] = removeSensibleValues(value);
  }

  return result;
}

/**
 * compare two versions
 * @param {string|number} a
 * @param {string|number} b
 * @return {number} -1 if a < b, 0 if a == b and 1 if a > b
 */
export function diffVersion(a, b) {
  const toArray = value => {
    value = String(value);

    const slots = value.split(/\./).map(x => parseInt(x, 10));

    const m = value.match(/\-(\w+)(.*)/);

    if (m) {
      const suffixes = { alpha: 1, beta: 2, rc: 3 };
      //console.log(`XXX ${suffixes[m[1]]}`);

      return [...slots,suffixes[m[1]],m[2]];
    }

    return slots;
  };

  const aa = toArray(a);
  const bb = toArray(b);

  for (const i in aa) {
    if (i >= bb.length) {
      break;
    }

    if (aa[i] < bb[i]) {
      return -1;
    }
    if (aa[i] > bb[i]) {
      return 1;
    }
  }

  return 0;
}
