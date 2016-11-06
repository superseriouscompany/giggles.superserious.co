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
        expect(err.response.body.message).toEqual("You must attach a valid photo in the `file` field of your multipart request.");
      });
    });

    it("413s if file is too large");

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

    it("415s if form is not multipart upload");

    it("400s if file is not present");

    it("413s if file is too large");

    it("400s if submission id doesn't exist");

    it("allows uploading a valid caption and creates a uuid", function() {
      return factory.submission().then(function(s) {
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
      return s.body;
    })
  },

  caption: function(params) {
    // TODO: allow adding caption to existing submission
    params = Object.assign({
      audio: fs.createReadStream(`${__dirname}/../fixtures/lawng.aac`),
    }, params)

    return factory.submission().then(function(s) {
      const formData = {
        audio: params.audio
      }

      return api.post({
        url: `/submissions/${submission.id}/captions`,
        formData: formData
      }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      });
    });
  }
}

function shouldFail(r) {
  throw `Expected an unsuccessful response, but got ${r.statusCode}: ${r.body}`;
}
