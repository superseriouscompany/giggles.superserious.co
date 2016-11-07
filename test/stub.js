const express    = require('express');
const bodyParser = require('body-parser');
const app        = express();

app.use(bodyParser.json());

app.use('/', function(req, res) {
  const status = req.query.status || 200;
  if( !req.body || !Object.keys(req.body).length ) { return res.sendStatus(status); }
  return res.status(status).json(req.body);
})

module.exports = function(port) {
  const server = app.listen(port);
  return server.close.bind(server);
}
