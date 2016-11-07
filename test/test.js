'use strict';

const request = require('request-promise'),
      fs = require('fs'),
      expect  = require('expect');

const baseUrl = process.env.NODE_ENV == 'production' ?
  'https://giggles.superserious.co' :
  'http://localhost:3000';

const api = request.defaults({
  baseUrl: baseUrl,
  json: true,
  resolveWithFullResponse: true,
})

describe("giggles api", function () {
  before(function() {
    return api('/').catch(function(err) {
      console.error(`API is not running at ${baseUrl}`);
      process.exit(1);
    })
  })

  describe('submission', function() {
    it("415s if form contains no multipart upload", function () {
      return api.post('/submissions', { submission: {cool: 'nice'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(415);
        expect(err.response.body.message).toEqual("Your `Content-Type` must be `multipart/form-data`.");
      });
    });

    it("400s if no file is present", function () {
      return api.post({ url: '/submissions', formData: {nope: 'nothing'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("You must attach a valid photo in the `photo` field of your multipart request.");
      });
    });

    it("413s if file is too large", function() {
      const formData = {
        photo: fs.createReadStream(__dirname + '/../fixtures/massive.jpg'),
      };

      return api.post({ url: '/submissions', formData: formData }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(413);
      })
    });

    it("allows uploading a valid submission and creates a uuid", function () {
      const formData = {
        photo: fs.createReadStream(__dirname + '/../fixtures/photo.jpg'),
      };

      return api.post({ url: '/submissions', formData: formData }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      })
    });
  });

  describe("caption", function() {
    let submission;

    before(function() {
      return factory.submission().then(function(s) {
        submission = s;
      })
    })

    it("415s if form is not multipart upload", function() {
      return api.post(`/submissions/${submission.id}/captions`, {cool: 'nice'}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(415, err);
      })
    });

    it("400s if file is not present", function() {
      return api.post({ url: `/submissions/${submission.id}/captions`, formData: {nope: 'nothing'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("You must attach a valid aac audio file in the `audio` field of your multipart request.");
      });
    });

    it("413s if file is too large", function() {
      return factory.caption({
        audio: fs.createReadStream(__dirname + '/../fixtures/massive.aac'),
      }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(413);
      });
    });

    it("400s if submission id doesn't exist", function() {
      return factory.caption({
        submissionId: 'nope'
      }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("The submission `nope` does not exist.")
      });
    });

    it("allows uploading a valid caption and creates a uuid", function() {
      const formData = {
        audio: fs.createReadStream(__dirname + '/../fixtures/lawng.aac'),
      }
      return api.post({
        url: `/submissions/${submission.id}/captions`,
        formData: formData
      }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      });
    });
  });

  describe("ratings", function() {
    let caption;

    before(function() {
      return factory.caption().then(function(c) { caption = c; })
    })

    describe("likes", function() {
      it("400s if caption is not found", function() {
        api.post('/captions/nope/like').then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body).toMatch(/doesn't exist/);
        })
      });

      it("204s on success", function() {
        api.post(`/captions/${caption.id}/like`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      })

      it("is reflected on caption");
    })

    describe("hates", function() {
      it("400s if caption is not found", function() {
        api.post('/captions/nope/hate').then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body).toMatch(/doesn't exist/);
        })
      });

      it("204s on success", function() {
        api.post(`/captions/${caption.id}/hate`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      })

      it("is reflected on caption");
    })
  });

  describe("moderation", function() {
    it("204s for anything", function() {
      return api.post(`/submissions/whatever/report`).then(function(r) {
        expect(r.statusCode).toEqual(204);
      })
    });
  });

  describe("next selection", function() {
    it("selects a random image from the queue");

    it("selects an image with the given ID");
  });

  describe("jumping the queue", function() {
    describe("iOS", function() {
      it("422s on malformed input");

      it("403s on receipt validation failure");

      it("jumps queue on success");
    });

    describe("Android", function() {
      it("422s on malformed input");

      it("403s on receipt validation failure");

      it("jumps queue on success");
    });
  });
});

const factory = {
  submission: function(params) {
    params = Object.assign({
      photo: fs.createReadStream(__dirname + '/../fixtures/photo.jpg'),
    }, params);

    const formData = {
      photo: params.photo,
    }

    return api.post({url: '/submissions', formData: formData}).then(function(s) {
      return api.post({
        url: `/next`,
        body: { id: s.body.id }
      }).then(function() {
        return s.body;
      })
    })
  },

  caption: function(params) {
    // TODO: allow adding caption to existing submission
    params = Object.assign({
      submissionId: null,
      audio: fs.createReadStream(`${__dirname}/../fixtures/lawng.aac`),
    }, params)

    const submissionId = params.submissionId ?
      Promise.resolve(params.submissionId) :
      factory.submission().then(function(s) { return s.id });

    return submissionId.then(function(submissionId) {
      const formData = {
        audio: params.audio
      }

      return api.post({
        url: `/submissions/${submissionId}/captions`,
        formData: formData
      }).then(function(r) {
        return r.body;
      });
    });
  }
}

function shouldFail(r) {
  throw `Expected an unsuccessful response, but got ${r}: ${r.statusCode} ${r.body}`;
}
