const fs   = require('fs');
const api  = require('./api');
const UUID = require('node-uuid');

const factory = {
  submission: function(params) {
    return factory.queuedSubmission(params).then(function(s) {
      return api.post({
        url: `/next`,
        body: { id: s.id }
      }).then(function() {
        return s;
      })
    });
  },

  queuedSubmission: function(params) {
    params = Object.assign({
      photo: fs.createReadStream(__dirname + '/fixtures/photo.jpg'),
    }, params);

    const formData = {
      photo: params.photo,
    }

    return api.post({url: '/submissions', formData: formData}).then(function(s) {
      return s.body
    });
  },

  caption: function(params) {
    params = Object.assign({
      submissionId: null,
      audio: fs.createReadStream(`${__dirname}/fixtures/lawng.aac`),
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
        return Object.assign(r.body, {submissionId: submissionId});
      });
    });
  },

  deviceToken: function(params) {
    params = Object.assign({
      deviceId: UUID.v1(),
      token:    UUID.v1(),
    }, params);

    return api.post({
      url: `/ios/pushTokens`,
      headers: {
        'x-device-id': params.deviceId,
      },
      body: {
        token: params.deviceToken,
      }
    }).then(function() {
      return params.token;
    })
  }
}

module.exports = factory;
