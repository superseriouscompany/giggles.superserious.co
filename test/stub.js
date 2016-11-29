'use strict';

const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();

let calls = [];

app.use(bodyParser.json());

app.use('*', function(req, res) {
  console.log("Got request", req.originalUrl, req.body)
  const status = req.query.status || 200;
  calls.unshift({url: req.originalUrl, body: req.body});
  if( !req.body || !Object.keys(req.body).length ) { return res.sendStatus(status); }
  return res.status(status).json(req.body);
})

module.exports = function(port) {
  const server = app.listen(port);
  console.log("listening on port", port);
  let handle   = server.close.bind(server);
  handle.calls = calls;
  return handle;
}
