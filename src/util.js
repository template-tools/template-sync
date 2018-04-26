export async function getPassword(options) {
  const [account, service] = options.keystore.split(/\//);

  try {
    const { getPassword } = require('keytar');
    return getPassword(account, service);
  } catch (e) {}
  return undefined;
}

export async function setPassword(pasword, options) {
  const [account, service] = options.keystore.split(/\//);
  try {
    const { setPassword } = require('keytar');
    setPassword(account, service, password);
  } catch (e) {}

  return password;
}

export function templateOptions(json, name) {
  if (json.template !== undefined && json.template.files !== undefined) {
    const m = p.template.files.find(f => f.merger === name);
    if (m !== undefined) {
      return m.options;
    }
  }
  return undefined;
}
