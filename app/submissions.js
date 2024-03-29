'use strict';

const multer      = require('multer');
const request     = require('request-promise');
const IAPVerifier = require('iap_verifier');
const sizeOf      = require('image-size');
const UUID        = require('uuid');
const fs          = require('fs');
const config      = require('../config');
const db          = require('../db/submissions');
const notify      = require('../lib/notify');
const iapClient   = new IAPVerifier();
const baseUrl     = config.baseUrl;
const s3          = new config.AWS.S3();

let upload = multer({
  limits: {fileSize: 1024 * 1024 * 2},
  storage: multer.diskStorage({
    destination: 'submissions/',
    filename: function(req, file, cb) {
      const uuid = UUID.v1();
      const extension = file.originalname.split('.')[1];
      if( !extension )  { return cb(null, uuid); }
      cb(null, `${uuid}.${extension}`);
    },
  }),
});

module.exports = function(app) {
  app.get('/submissions', all);
  app.post('/submissions', upload.single('photo'), create);
  app.post('/submissions/:id/jumpQueue', jumpQueueIOS);
  app.post('/submissions/:id/jumpQueueAndroid', jumpQueueAndroid)
  app.post('/submissions/:id/report', report);
  app.post('/next', pick);
}

function all(req, res, next) {
  return db.all().then(function(submissions) {
    res.json({
      submissions: submissions
    })
  }).catch(next);
}

function create(req, res, next) {
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

  const filePath = `./submissions/${req.file.filename}`;
  const dimensions = sizeOf(filePath);

  var key = req.file.filename;

  var params = {Bucket: config.submissionsBucket, Key: key, Body: fs.createReadStream(filePath), ACL: 'public-read', ContentType: req.file.mimetype}
  s3.upload(params, function(err, s3Payload) {
    if( err ) { return next(err); }
    if( !s3Payload || !s3Payload.Location ) { return next(new Error(`s3 returned no url ${JSON.stringify(s3Payload)}`)); }

    return db.create({
      id: uuid,
      width: dimensions.width,
      height: dimensions.height,
      image_url: s3Payload.Location,
      isPublished: 'no',
      publishedAt: 0,
    }).then(function() {
      return db.count().then(function(queueSize) {
        res.status(201).json({id: uuid, queueSize: queueSize || 69});
      }).catch(function(err) {
        console.warn(err, err.stack);
        res.status(201).json({id: uuid, queueSize: 69});
      })
    }).catch(next);
  })
}

function jumpQueueIOS(req, res, next) {
  const receipt = req.body.receipt;

  if( !receipt ) {
    return res.status(400).json({message: 'You must provide the Apple `receipt` in your request body.'});
  }

  db.get(req.params.id).then(function(s) {
    if(!s) {
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

    return client.verifyReceipt(receipt, true, function(valid, msg, payload) {
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

      return db.pick(req.params.id).then(function() {
        notify.topic('all', 'Everything is dumb.', !!req.query.stubPort);
        return res.sendStatus(204);
      })
    })
  }).catch(next);
}

function jumpQueueAndroid(req, res, next) {
  const purchaseToken = req.body.purchaseToken;
  const bundleId      = 'com.superserious.giggles';
  const productId     = 'com.superserious.giggles.now';

  if( !purchaseToken ) {
    return res.status(400).json({message: 'You must provide the google `purchaseToken` in your request body.'});
  }

  db.get(req.params.id).then(function(s) {
    if( !s ) { return res.status(410).json({message: `\`${req.params.id}\` does not exist.`}); }
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

      return db.pick(req.params.id).then(function() {
        notify.topic('all', 'Everything is dumb.', !!req.query.stubPort);
        return res.sendStatus(204);
      })
    }).catch(function(err) {
      next(err);
    })
  }).catch(next);

}

function report(req, res, next) {
  res.sendStatus(204);
}

function pick(req, res, next) {
  const getId = req.body.id ? Promise.resolve(req.body.id) : db.unpicked();

  getId.then(function(id) {
    if( !id ) { return res.status(400).json({message: 'Queue empty'}) }
    return db.pick(id);
  }).then(function() {
    notify.topic('all', 'Everything is dumb.', !!req.query.stubPort);
    res.sendStatus(204);
  }).catch(next);
}
