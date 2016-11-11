'use strict';

const config  = require('config');
const request = require('request');
const fs      = require('fs');

const baseUrl = config.baseUrl;

for( var i = 1; i <= 5; i++ ) {
  request({
    method: 'POST',
    url: `${baseUrl}/submissions`,
    formData: {
      photo: fs.createReadStream(`./test/fixtures/photo${i}.jpg`)
    }
  }, function(err, resp, body) {
    if( err ) { throw err; }

    console.log(resp.statusCode, body);
  })
}

setTimeout(function() {
  request({
    method: 'POST',
    url: `${baseUrl}/next`,
  }, function(err, resp, body) {
    if( err ) { throw err; }

    console.log(resp.statusCode, body);
  })
}, 500);
