const keytar = require('keytar');

export async function getPassword(options) {
  const [account, service] = options.keystore.split(/\//);

  const password = await keytar.getPassword(account, service);

  return password;
}

export async function setPassword(pasword, options) {
  const [account, service] = options.keystore.split(/\//);

  keytar.setPassword(account, service, password);

  return password;
}
