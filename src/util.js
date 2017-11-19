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
