const keychain = require('keychain');

export function getPassword(options) {
  const [account, service] = options.keystore.split(/\//);

  return new Promise((resolve, reject) => {
    keychain.getPassword({ account, service }, (err, pass) => {
      if (err) {
        reject(err);
      } else {
        resolve(pass);
      }
    });
  });
}

export function setPassword(password, options) {
  const [account, service] = options.keystore.split(/\//);

  return new Promise((resolve, reject) => {
    keychain.setPassword({ account, service }, (err, pass) => {
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

  return password;
}

export async function setPassword(pasword, options) {
  const [account, service] = options.keystore.split(/\//);

  keytar.setPassword(account, service, password);

  return password;
}
*/
