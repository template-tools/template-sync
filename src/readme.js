/* jslint node: true, esnext: true */

export default function (left, right, options = {}) {
  const badges =
    `[![npm](https://img.shields.io/npm/v/{{name}}.svg)](https://www.npmjs.com/package/{{name}})
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/Kronos-Integration/{{name}})
[![Build Status](https://secure.travis-ci.org/Kronos-Integration/{{name}}.png)](http://travis-ci.org/Kronos-Integration/{{name}})
[![bithound](https://www.bithound.io/github/Kronos-Integration/{{name}}/badges/score.svg)](https://www.bithound.io/github/Kronos-Integration/{{name}})
[![codecov.io](http://codecov.io/github/Kronos-Integration/{{name}}/coverage.svg?branch=master)](http://codecov.io/github/Kronos-Integration/{{name}}?branch=master)
[![Code Climate](https://codeclimate.com/github/Kronos-Integration/{{name}}/badges/gpa.svg)](https://codeclimate.com/github/Kronos-Integration/{{name}})
[![GitHub Issues](https://img.shields.io/github/issues/Kronos-Integration/{{name}}.svg?style=flat-square)](https://github.com/Kronos-Integration/{{name}}/issues)
[![Dependency Status](https://david-dm.org/Kronos-Integration/{{name}}.svg)](https://david-dm.org/Kronos-Integration/{{name}})
[![devDependency Status](https://david-dm.org/Kronos-Integration/{{name}}/dev-status.svg)](https://david-dm.org/Kronos-Integration/{{name}}#info=devDependencies)
[![docs](http://inch-ci.org/github/Kronos-Integration/{{name}}.svg?branch=master)](http://inch-ci.org/github/Kronos-Integration/{{name}})
[![downloads](http://img.shields.io/npm/dm/{{name}}.svg?style=flat-square)](https://npmjs.org/package/{{name}})
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
`;

  const lines = readme.split(/\n/);
  const fel = lines.findIndex(l => l.length === 0);

  return badges.replace(/\{\{name\}\}/g, () => repo) +
    lines.slice(fel).join('\n');
}
