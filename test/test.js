const request = require('request-promise'),
      fs = require('fs'),
      expect  = require('expect');

const baseUrl = 'https://superserious.ngrok.io';

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
        expect(err.response.body.message).toEqual("Your `Content-Type` must be `multipart/form-data`");
      });
    });

    it("400s if no file is present", function () {
      return api.post('/submissions').then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.body.message).toEqual("You must provide a `file`");
      });
    });

    it("allows uploading a valid submission and creates a uuid", function () {
      const formData = {
        photo: fs.createReadStream(__dirname + '/../fixtures/photo.jpg')
      };

      return api.post({ url: '/submissions', formData: formData }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      })
    });
  })
});

function shouldFail(r) {
  throw `Expected an unsuccessful response, but got ${r.statusCode}: ${r.body}`;
}
