'use strict';

module.exports = function(app) {
  app.post('/ios/push_tokens', iOSRegisterToken);
  app.post('/android/push_tokens', androidRegisterToken);
}

function iOSRegisterToken(req, res) {
  res.sendStatus(204);
}

function androidRegisterToken(req, res) {
  res.sendStatus(204);
}
