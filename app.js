'use strict';

const express     = require('express');
const multer      = require('multer');
const UUID        = require('node-uuid');
const bodyParser  = require('body-parser');
const aacDuration = require('aac-duration');
const request     = require('request-promise');
const app         = express();
const port        = process.env.PORT || 3000;
const baseUrl     = process.env.NODE_ENV == 'production' ?
  'https://giggles.superserious.co' :
  'https://superserious.ngrok.io';

global.captions    = [];
global.submissions = [];
global.queue       = [];

// middleware
app.use(bodyParser.json());
app.use(express.static('captions', {maxAge: 86400000}));
app.use(express.static('submissions', {maxAge: 86400000}));

require('./app/submissions')(app);
require('./app/captions')(app);

// administrative
app.get('/', ping);
app.get('/kill', killSwitch);
if( process.env.NODE_ENV != 'production' ) {
  app.delete('/all', flush);
}

app.use(function(err, req, res, next) {
  if( err.code == 'LIMIT_FILE_SIZE' ) { return res.status(413).json({message: 'Your file is too big.'}) }

  console.error(err, err.stack);
  res.status(500).json({message: 'Something went wrong.'});
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})

function flush(req, res) {
  captions = [];
  submissions = [];
  queue = [];
  res.sendStatus(204);
}

function killSwitch(req, res) {
  res.json({
    kill: false
  })
}

function ping(req, res) {
  res.json({cool: 'nice'});
}
