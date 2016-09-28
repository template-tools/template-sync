/* jslint node: true, esnext: true */
export default function (left, right, options = {}) {

  const yml = yaml.safeLoad(left);

  yml.node_js = [
    '6.6'
  ];

  if (yml.branches === undefined) {
    yml.branches = {};
  }

  yml.branches.only = [
    'master'
  ];

  yml.before_install = [
    'npm i -g npm@latest'
  ];

  yml.before_script = [
    'npm prune',
    'npm install -g codecov'
  ];

  yml.after_script = [
    'codecov'
  ];

  if (yml.notifications === undefined) {
    yml.notifications = {};
  }

  yml.notifications.email = [
    'torstenlink@gmx.de',
    'markus.felten@gmx.de'
  ];

  return yaml.safeDump(yml);
}
