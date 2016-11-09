'use strict';

const multer      = require('multer');
const request     = require('request-promise');
const UUID        = require('node-uuid');
const baseUrl     = process.env.NODE_ENV == 'production' ?
  'https://giggles.superserious.co' :
  'https://superserious.ngrok.io';

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

const caption = {
  all: function all(req, res) {
    res.json({
      captions: captions.filter(function(c) { return c.submission_id == submissions[0].id}).sort(function(a,b) { return (a.likes || 0) - (a.hates || 0) < (b.likes || 0) - (b.hates || 0) })
    })
  },

  forSubmission: function forSubmission(req, res) {
    let results = captions.filter(function(c) { return c.submission_id == req.params.id });
    results = results.sort(function(a,b) { return (a.likes || 0) - (a.hates || 0) < (b.likes || 0) - (b.hates || 0)})

    res.json({
      captions: results
    })
  },

  create: function create(req, res) {
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
  },

  like: function like(req, res) {
    var caption = captions.find(function(c) { return c.id === req.params.id });
    if( !caption ) { return res.status(400).json({message: `\`${req.params.id}\` doesn't exist.`}); }
    caption.likes = caption.likes || 0;
    caption.likes++;
    res.sendStatus(204);
  },

  hate: function hate(req, res) {
    var caption = captions.find(function(c) { return c.id === req.params.id });
    if( !caption ) { return res.status(400).json({message: `\`${req.params.id}\` doesn't exist.`}); }
    caption.hates = caption.hates || 0;
    caption.hates++;
    res.sendStatus(204);
  },
}

module.exports = function(app) {
  app.get('/captions', caption.all);
  app.get('/submissions/:id/captions', caption.forSubmission);
  app.post('/submissions/:id/captions', captionUpload.single('audio'), caption.create);
  app.post('/captions/:id/like', caption.like);
  app.post('/captions/:id/hate', caption.hate);
}
