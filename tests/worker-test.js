import test from 'ava';
import { worker } from '../src/worker';

const ora = require('ora');

const REPOSITORY_NAME = 'arlac77/sync-test-repository';
const TEMPLATE_REPO = 'Kronos-Tools/npm-package-template';

test.only('worker', async t => {
  const spinner = ora('args'); // .start();

  await worker(spinner, process.env.GH_TOKEN, REPOSITORY_NAME, TEMPLATE_REPO);

  t.pass('worker done');
});
