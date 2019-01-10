export function decodeScripts(scripts) {
  if (scripts === undefined) {
    return undefined;
  }

  const decoded = {};

  Object.keys(scripts).forEach(key => {
    let script = scripts[key];

    let overwrite = false;

    if (script === "-") {
      decoded[key] = { op: "-" };
    } else {
      if (script.match(/^#overwrite/)) {
        script = script.replace(/^#overwrite\s+/, "");
        overwrite = true;
      }
      if (script.match(/&&/)) {
        decoded[key] = {
          overwrite,
          op: "&&",
          args: script.split(/\s*&&\s*/)
        };
      } else {
        decoded[key] = { value: script, overwrite };
      }
    }
  });

  return decoded;
}

export function mergeScripts(dest, source) {
  if (source === undefined) {
    if (dest === undefined) {
      return undefined;
    }
    source = {};
  } else if (dest === undefined) {
    dest = {};
  }

  function mergeOP(a, b) {
    const args = x => {
      if (x === undefined) return [];
      return x.args === undefined ? [x.value] : x.args;
    };

    const t = args(a).concat(args(b));

    return {
      op: "&&",
      args: t.filter((item, pos) => t.indexOf(item) == pos)
    };
  }

  Object.keys(source).forEach(key => {
    let d = dest[key];

    if (d !== undefined && d.op === "-") {
      delete dest[key];
      return;
    }

    const s = source[key];
    switch (s.op) {
      case "-":
        delete dest[key];
        return;
        break;

      case "&&":
        d = s.overwrite ? s : mergeOP(s, d);
        break;

      default:
        if (d === undefined) {
          d = { value: s.value };
        } else {
          switch (d.op) {
            case "-":
              delete dest[key];
              return;

            case "&&":
              d = mergeOP(s, d);
              break;

            default:
              d.value = s.value;
          }
        }
    }

    dest[key] = d;
  });

  return dest;
}

export function encodeScripts(encoded) {
  if (encoded === undefined) {
    return undefined;
  }

  const scripts = {};

  Object.keys(encoded).forEach(key => {
    const e = encoded[key];
    switch (e.op) {
      case "&&":
        scripts[key] = e.args.join(" && ");
        break;

      default:
        scripts[key] = e.value;
    }
  });

  return scripts;
}
