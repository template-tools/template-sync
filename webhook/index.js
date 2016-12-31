/* jslint node: true, esnext: true */

const micro = require('micro'),
  createHandler = require('github-webhook-handler');
require('now-logs')('dfgkjd&dfh');

const handler = createHandler({
  path: '/webhook',
  secret: 'dfgkjd&dfh'
});

const server = micro(async(req, res) => {

  handler(req, res, (err) => {
    res.statusCode = 404;
    res.end('no such location');
  });

  res.writeHead(200);
  res.end('woot');
});

handler.on('error', function (err) {
  console.error('Error:', err.message);
});

handler.on('push', function (event) {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref);
});

server.listen(3000);
