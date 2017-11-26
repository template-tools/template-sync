const keychain = require('keychain');

export function getPassword(...args) {
  return new Promise((resolve, reject) => {
    keychain.getPassword(...args, (err, pass) => {
      if (err) {
        reject(err);
      } else {
        resolve(pass);
      }
    });
  });
}

export function setPassword(...args) {
  return new Promise((resolve, reject) => {
    keychain.setPassword(...args, (err, pass) => {
      if (err) {
        reject(err);
      } else {
        resolve(pass);
      }
    });
  });
}

/*
const keytar = require('keytar');

export async function getPassword(options) {
  const [account, service] = options.keystore.split(/\//);

  const password = await keytar.getPassword(account, service);

  if (password !== null) {
    return password;
  }

  return savePassword(account, service);
}

export async function savePassword(account, service) {
  const schema = {
    properties: {
      password: {
        required: true,
        hidden: true
      }
    }
  };

  keytar.setPassword(account, service, password);

  return password;
}
*/
