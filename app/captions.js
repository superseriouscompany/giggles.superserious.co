'use strict';

const multer      = require('multer');
const UUID        = require('node-uuid');
const aacDuration = require('aac-duration');
const config      = require('../config');
const db          = require('../db/captions');
const submissions = require('../db/submissions');
const baseUrl     = config.baseUrl;

const captionUpload = multer({
  limits: {fileSize: 1024 * 1024 * 2},
  storage: multer.diskStorage({
    destination: 'captions/',
    filename: function(req, file, cb) {
      const uuid = UUID.v1();
      const extension = file.originalname.split('.')[1];
      if( !extension )  { return cb(null, uuid); }
      cb(null, `${uuid}.${extension}`);
    }
  }),
});

module.exports = function(app) {
  app.get('/captions', all);
  app.get('/submissions/:id/captions', forSubmission);
  app.post('/submissions/:id/captions', captionUpload.single('audio'), create);
  app.post('/captions/:id/like', like);
  app.post('/captions/:id/hate', hate);
}

function all(req, res, next) {
  submissions.latest().then(function(s) {
    return db.forSubmission(s.id)
  }).then(function(captions) {
    res.json({
      captions: captions,
    })
  }).catch(next);
}

function forSubmission(req, res, next) {
  db.forSubmission(req.params.id).then(function(captions) {
    res.json({
      captions: captions,
    })
  }).catch(next);
}

function create(req, res, next) {
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

  const uuid = UUID.v1();

  submissions.get(req.params.id).then(function(s) {
    if( !s ) {
      return res.status(400).json({
        message: `The submission \`${req.params.id}\` does not exist.`,
      })
    }

    let duration = 42;
    try {
      duration = aacDuration(`./captions/${req.file.filename}`);
    } catch(err) {
      console.error(err, "unable to convert", uuid);
    }

    return db.create({
      id: uuid,
      filename: req.file.filename,
      submissionId: req.params.id,
      duration: duration,
      audio_url: `${baseUrl}/${req.file.filename}`,
      likes: 0,
      hates: 0,
      score: 0,
    })
  }).then(function() {
    res.status(201).json({id: uuid});
  }).catch(next);
}

function like(req, res, next) {
  db.like(req.params.id).then(function() {
    res.sendStatus(204);
  }).catch(function(err) {
    if( err.message == 'The provided expression refers to an attribute that does not exist in the item' ) {
      return res.status(400).json({message: `caption \`${req.params.id}\` does not exist`})
    }

    return next(err);
  });
}

function hate(req, res, next) {
  db.hate(req.params.id).then(function() {
    res.sendStatus(204);
  }).catch(function(err) {
    if( err.message == 'The provided expression refers to an attribute that does not exist in the item' ) {
      return res.status(400).json({message: `caption \`${req.params.id}\` does not exist`})
    }

    return next(err);
  });
}
