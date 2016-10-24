'use strict';

const express     = require('express');
const multer      = require('multer');
const UUID        = require('node-uuid');
const sizeOf      = require('image-size');
const IAPVerifier = require('iap_verifier');
const bodyParser  = require('body-parser');
const aacDuration = require('aac-duration');

const app         = express();
const port        = process.env.PORT || 3000;
const iapClient   = new IAPVerifier();

let captionStorage = multer.diskStorage({
  destination: 'captions/',
  filename: function(req, file, cb) {
    const uuid = UUID.v1();
    const extension = file.originalname.split('.')[1];
    if( !extension )  { return cb(null, uuid); }
    cb(null, `${uuid}.${extension}`);
  }
})
let submissionStorage = multer.diskStorage({
  destination: 'submissions/',
  filename: function(req, file, cb) {
    const uuid = UUID.v1();
    const extension = file.originalname.split('.')[1];
    if( !extension )  { return cb(null, uuid); }
    cb(null, `${uuid}.${extension}`);
  }
})

let captionUpload    = multer({storage: captionStorage});
let submissionUpload = multer({storage: submissionStorage});

let captions    = [],
    submissions = [],
    queue       = [];

app.use(bodyParser.json());

app.use(express.static('captions', {maxAge: 86400000}));
app.use(express.static('submissions', {maxAge: 86400000}));

app.get('/', function(req, res) {
  res.json({cool: 'nice'});
})

app.post('/submissions', submissionUpload.single('photo'), function(req, res) {
  const uuid = UUID.v1();
  if( req.file && req.file.filename ) {
    const dimensions = sizeOf(`./submissions/${req.file.filename}`);

    queue.push({
      id: uuid,
      filename: req.file.filename,
      width: dimensions.width,
      height: dimensions.height,
      image_url: `https://superserious.ngrok.io/${req.file.filename}`,
    })
    res.status(201).json({id: uuid, queueSize: queue.length});
  }
})

app.post('/next', function(req,res) {
  if( !queue.length ) { return res.status(400).json({error: 'Queue empty'}) }

  choose(Math.random() * (queue.length - 1));
  res.sendStatus(204);
})

function choose(index) {
  let chosenOne = queue.splice(index, 1)[0];
  chosenOne.publishedAt = +new Date;
  submissions.unshift(chosenOne);
}

app.post('/submissions/:id/jumpQueue', function(req, res) {
  const receipt = req.body.receipt;

  iapClient.verifyReceipt(receipt, true, function(valid, msg, payload) {
    if( !valid ) {
      console.error(msg, payload);
      return res.status(403).json({error: msg});
    }

    if( !payload.receipt.in_app || payload.receipt.in_app[0].product_id != 'com.superserious.steffigraffiti.gonext' ) {
      console.warn(payload);
      return res.status(403).json({error: "You have not purchased a pass to skip the line"});
    }

    for( var i = 0; i < queue.length; i++ ) {
      if( queue[i].id == req.params.id ) {
        choose(i);
        return res.sendStatus(204)
      }
    }

    return res.status(400).json({error: `${req.params.id} isn't in the queue.`});
  })
})

app.get('/submissions', function(req, res) {
  res.json({
    submissions: submissions
  })
})

app.get('/captions', function(req, res) {
  res.json({
    captions: captions.filter(function(c) { return c.submission_id == submissions[0].id})
  })
})

app.get('/submissions/:id/captions', function(req, res) {
  res.json({
    captions: captions.filter(function(c) { return c.submission_id == req.params.id })
  })
})

app.post('/submissions/:id/captions', captionUpload.single('audio'), function(req, res) {
  const duration = aacDuration(`./captions/${req.file.filename}`);

  const uuid = UUID.v1();
  if( req.file && req.file.filename ) {
    captions.unshift({
      id: uuid,
      filename: req.file.filename,
      submission_id: req.params.id,
      duration: duration,
    })
  }
  res.status(201).json({id: uuid});
})

app.post('/captions/:id/like', function(req, res) {
  var caption = captions.find(function(c) { return c.id === req.params.id });
  if( !caption ) { return res.sendStatus(404); }
  caption.likes = caption.likes || 0;
  caption.likes++;
  res.sendStatus(204);
})

app.post('/captions/:id/hate', function(req, res) {
  var caption = captions.find(function(c) { return c.id === req.params.id });
  if( !caption ) { return res.sendStatus(404); }
  caption.hates = caption.hates || 0;
  caption.hates++;
  res.sendStatus(204);
})

app.get('/kill', function(req, res) {
  res.json({
    kill: false
  })
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})
