import { worker } from '../src/worker';

const micro = require('micro'),
  createHandler = require('github-webhook-handler');
require('now-logs')('dfgkjd&dfh');
const ora = require('ora');

const handler = createHandler({
  path: '/webhook',
  secret: 'dfgkjd&dfh'
});

const server = micro(async (req, res) => {
  handler(req, res, err => {
    res.statusCode = 404;
    res.end('no such location');
  });

  res.writeHead(200);
  res.end('woot');
});

handler.on('error', err => {
  console.error('Error:', err.message);
});

const spinner = ora('args');

handler.on('push', async event => {
  console.log(
    'Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref
  );

  const pullRequest = await worker(
    spinner,
    console,
    process.env.GH_TOKEN,
    event.payload.repository.name
  );
});

server.listen(3000);
