const request = require('request-promise');
const config  = require('../config');
const baseUrl = process.env.NODE_ENV == 'production' ? config.baseUrl : 'http://localhost:3000';

module.exports = request.defaults({
  baseUrl: baseUrl,
  json: true,
  resolveWithFullResponse: true,
})

module.exports.baseUrl = baseUrl;
