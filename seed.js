'use strict';

const request = require('request');
const fs      = require('fs');

const baseUrl = 'https://giggles.superserious.co';

for( var i = 1; i <= 5; i++ ) {
  request({
    method: 'POST',
    url: `${baseUrl}/submissions`,
    formData: {
      photo: fs.createReadStream(`./fixtures/photo${i}.jpg`)
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
