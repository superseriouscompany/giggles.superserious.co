'use strict';

const express     = require('express');
const multer      = require('multer');
const UUID        = require('node-uuid');
const sizeOf      = require('image-size');
const IAPVerifier = require('iap_verifier');
const bodyParser  = require('body-parser');
const aacDuration = require('aac-duration');
const request     = require('request-promise');

const app         = express();
const port        = process.env.PORT || 3000;
const iapClient   = new IAPVerifier();
const baseUrl     = process.env.NODE_ENV == 'production' ?
  'https://giggles.superserious.co' :
  'https://superserious.ngrok.io';

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

const MB = 1024*1024;

let captionUpload    = multer({storage: captionStorage, limits: {fileSize: MB * 2}});
let submissionUpload = multer({storage: submissionStorage, limits: {fileSize: MB * 2}});

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

  if( !req.file || !req.file.filename ) {
    const contentType = req.get('Content-Type');
    if( !contentType || !contentType.match(/multipart\/form-data/i) ) {
      return res.status(415).json({
        message: "Your `Content-Type` must be `multipart/form-data`."
      });
    }

    return res.status(400).json({
      message: "You must attach a valid photo in the `photo` field of your multipart request."
    });
  }

  const dimensions = sizeOf(`./submissions/${req.file.filename}`);

  queue.push({
    id: uuid,
    filename: req.file.filename,
    width: dimensions.width,
    height: dimensions.height,
    image_url: `${baseUrl}/${req.file.filename}`,
  })
  res.status(201).json({id: uuid, queueSize: queue.length});
})

app.post('/next', function(req,res) {
  if( !queue.length ) { return res.status(400).json({message: 'Queue empty'}) }

  if( !req.body.id ) {
    choose(Math.random() * (queue.length - 1));
    return res.sendStatus(204);
  }

  for( var i = 0; i < queue.length; i++ ) {
    if( queue[i].id == req.body.id ) {
      choose(i);
      return res.sendStatus(204);
    }
  }

  return res.status(400).json({message: `\`${req.body.id}\` was not found in the submissions queue.`});
})

function choose(index) {
  let chosenOne = queue.splice(index, 1)[0];
  chosenOne.publishedAt = +new Date;
  submissions.unshift(chosenOne);
}

app.post('/submissions/:id/jumpQueue', function(req, res, next) {
  const receipt = req.body.receipt;

  if( !receipt ) {
    return res.status(400).json({message: 'You must provide the Apple `receipt` in your request body.'});
  }

  let submissionIndex;
  for( var i = 0; i < queue.length; i++ ) {
    if( queue[i].id == req.params.id ) {
      submissionIndex = i;
    }
  }
  if( submissionIndex === undefined ) {
    return res.status(410).json({message: `\`${req.params.id}\` does not exist.`});
  }

  let client;
  if( process.env.NODE_ENV != 'production' && req.query.stubPort ) {
    client = new IAPVerifier();
    client.stubUrl = 'http://localhost:3001';
    client.stubBody = req.body.stubBody || {};
  } else {
    client = iapClient;
  }

  client.verifyReceipt(receipt, true, function(valid, msg, payload) {
    if( !valid ) {
      console.error(msg, payload);
      return res.status(403).json({error: msg});
    }

    if( !payload.receipt || !payload.receipt.in_app || !payload.receipt.in_app[0] ) {
      console.warn(payload);
      return next(new Error('Invalid payload from apple servers'));
    }

    if( !payload.receipt.in_app || payload.receipt.in_app[0].product_id != 'com.superserious.giggles.now' ) {
      console.warn(payload);
      return res.status(403).json({error: "You have not purchased a pass to skip the line"});
    }

    choose(submissionIndex);
    return res.sendStatus(204);
  })
})

app.post('/submissions/:id/jumpQueueAndroid', function(req, res, next) {
  const purchaseToken = req.body.purchaseToken;
  const bundleId      = 'com.superserious.giggles';
  const productId     = 'com.superserious.giggles.now';

  if( !purchaseToken ) {
    return res.status(400).json({message: 'You must provide the google `purchaseToken` in your request body.'});
  }

  let submissionIndex;
  for( var i = 0; i < queue.length; i++ ) {
    if( queue[i].id == req.params.id ) {
      submissionIndex = i;
    }
  }
  if( submissionIndex === undefined ) {
    return res.status(410).json({message: `\`${req.params.id}\` does not exist.`});
  }

  const baseUrl = process.env.NODE_ENV != 'production' && req.query.stubPort ?
    `http://localhost:${req.query.stubPort}` :
    'https://www.googleapis.com';

  request.post('https://accounts.google.com/o/oauth2/token', {
    form: {
      grant_type: 'refresh_token',
      client_id: '404145724987-sj8luhbbehlnls7in58n5t9fdpl6n6qu.apps.googleusercontent.com',
      client_secret: 'w-NPd4WDoSXGV_oIyGdr31eI',
      refresh_token: '1/_1pmxC4tVeTclcsCNyBUsPaWHYTefGgAdt1xalQ1xqU',
    },
    json: true,
  }).then(function(body) {
    const accessToken = body.access_token;
    let url = `${baseUrl}/androidpublisher/v2/applications/${bundleId}/purchases/products/${productId}/tokens/${purchaseToken}?access_token=${accessToken}`

    if( process.env.NODE_ENV != 'production' && req.query.stubPort ) {
      if( req.query.stubStatus ) url += `&status=${req.query.stubStatus}`;
      return request.patch(url, { json: true, body: req.body.stubBody });
    }

    return request(url, {json: true});
  }).then(function(body) {
    if( body.purchaseState !== 0 ) { throw new Error('purchaseState is invalid'); }
    if( body.consumptionState !== 1 ) { throw new Error('consumptionState is invalid'); }

    choose(submissionIndex);
    return res.sendStatus(204);
  }).catch(function(err) {
    next(err);
  })
})

app.post('/submissions/:id/report', function(req, res) {
  res.sendStatus(204);
})

app.get('/submissions', function(req, res) {
  res.json({
    submissions: submissions
  })
})

app.get('/captions', function(req, res) {
  res.json({
    captions: captions.filter(function(c) { return c.submission_id == submissions[0].id}).sort(function(a,b) { return (a.likes || 0) - (a.hates || 0) < (b.likes || 0) - (b.hates || 0) })
  })
})

app.get('/submissions/:id/captions', function(req, res) {
  let results = captions.filter(function(c) { return c.submission_id == req.params.id });
  results = results.sort(function(a,b) { return (a.likes || 0) - (a.hates || 0) < (b.likes || 0) - (b.hates || 0)})

  res.json({
    captions: results
  })
})

app.post('/submissions/:id/captions', captionUpload.single('audio'), function(req, res) {
  if( !req.file || !req.file.filename ) {
    const contentType = req.get('Content-Type');
    if( !contentType || !contentType.match(/multipart\/form-data/i) ) {
      return res.status(415).json({
        message: "Your `Content-Type` must be `multipart/form-data`."
      });
    }

    return res.status(400).json({
      message: "You must attach a valid aac audio file in the `audio` field of your multipart request."
    });
  }

  if( !submissions.find(function(s) { return s.id == req.params.id }) ) {
    return res.status(400).json({
      message: `The submission \`${req.params.id}\` does not exist.`,
    })
  }

  const uuid = UUID.v1();

  let duration = 42;
  try {
    duration = aacDuration(`./captions/${req.file.filename}`);
  } catch(err) {
    console.error(err, "unable to convert", uuid);
  }

  if( req.file && req.file.filename ) {
    captions.unshift({
      id: uuid,
      filename: req.file.filename,
      submission_id: req.params.id,
      duration: duration,
      audio_url: `${baseUrl}/${req.file.filename}`,
    })
  }
  res.status(201).json({id: uuid});
})

app.post('/captions/:id/like', function(req, res) {
  var caption = captions.find(function(c) { return c.id === req.params.id });
  if( !caption ) { return res.status(400).json({message: `\`${req.params.id}\` doesn't exist.`}); }
  caption.likes = caption.likes || 0;
  caption.likes++;
  res.sendStatus(204);
})

app.post('/captions/:id/hate', function(req, res) {
  var caption = captions.find(function(c) { return c.id === req.params.id });
  if( !caption ) { return res.status(400).json({message: `\`${req.params.id}\` doesn't exist.`}); }
  caption.hates = caption.hates || 0;
  caption.hates++;
  res.sendStatus(204);
})

app.get('/kill', function(req, res) {
  res.json({
    kill: false
  })
})

if( process.env.NODE_ENV != 'production' ) {
  app.delete('/all', function(req, res) {
    captions = [];
    submissions = [];
    queue = [];
    res.sendStatus(204);
  })
}

app.use(function(err, req, res, next) {
  if( err.code == 'LIMIT_FILE_SIZE' ) { return res.status(413).json({message: 'Your file is too big.'}) }

  console.error(err, err.stack);
  res.status(500).json({message: 'Something went wrong.'});
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})
