const request = require('request-promise'),
      expect  = require('expect');

const api = request.defaults({
  baseUrl: 'https://httpbin.org',
  json: true,
  resolveWithFullResponse: true,
})

describe("giggles api", function () {
  it("works", function () {
    return api('/status/400').then(function(r) {
      expect(r.statusCode).toEqual(200);
      expect(r.body.url).toEqual('https://httpbin.org/get');
    }).catch(function(err) {
      expect(err.statusCode).toEqual(400);
    })
  });
});
