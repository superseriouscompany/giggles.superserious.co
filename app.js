'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const app         = express();
const port        = process.env.PORT || 3000;

// middleware
app.use(bodyParser.json());
app.use(express.static('captions', {maxAge: 86400000}));
app.use(express.static('submissions', {maxAge: 86400000}));

// endpoints
require('./app/submissions')(app);
require('./app/captions')(app);
require('./app/users')(app);

// administrative endpoints
app.get('/', ping);
app.get('/kill', killSwitch);
app.delete('/all', flush);

// error handler
app.use(function(err, req, res, next) {
  if( err.code == 'LIMIT_FILE_SIZE' ) { return res.status(413).json({message: 'Your file is too big.'}) }

  console.error(err, err.stack);
  res.status(500).json({message: 'Something went wrong.'});
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})

function ping(req, res) {
  res.json({cool: 'nice'});
}

function killSwitch(req, res) {
  res.json({
    kill: false
  })
}

function flush(req, res, next) {
  if( process.env.NODE_ENV == 'production' ) { return res.sendStatus(403); }

  return res.sendStatus(204);
}
