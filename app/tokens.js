'use strict';

module.exports = function(app) {
  app.post('/ios/pushTokens', iOSRegisterToken);
  app.post('/android/pushTokens', androidRegisterToken);
}

function iOSRegisterToken(req, res) {
  console.log("registered ios token", req.body.token);
  res.sendStatus(204);
}

function androidRegisterToken(req, res) {
  console.log("registered android token", req.body.token);
  res.sendStatus(204);
}
