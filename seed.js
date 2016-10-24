'use strict';

const request = require('request');
const fs      = require('fs');

for( var i = 1; i <= 5; i++ ) {
  request({
    method: 'POST',
    url: 'http://localhost:3000/submissions',
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
    url: 'http://localhost:3000/next',
  }, function(err, resp, body) {
    if( err ) { throw err; }

    console.log(resp.statusCode, body);
  })
}, 500);
