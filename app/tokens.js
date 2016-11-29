'use strict';

const db   = require('../db/users');
const UUID = require('node-uuid');

module.exports = function(app) {
  app.post('/ios/pushTokens', iOSRegisterToken);
  app.post('/android/pushTokens', androidRegisterToken);
}

function iOSRegisterToken(req, res, next) {
  const uuid = UUID.v1();

  db.create({
    id: uuid,
    deviceId: req.get('x-device-id'),
    token: req.body.token,
    platform: 'iOS',
  }).then(function() {
    console.log("registered ios token", req.body.token);
    res.status(201).json({id: uuid});
  }).catch(next);
}

function androidRegisterToken(req, res) {
  db.create({
    id: uuid,
    deviceId: req.get('x-device-id'),
    token: req.body.token,
    platform: 'Android',
  }).then(function() {
    console.log("registered ios token", req.body.token);
    res.status(201).json({id: uuid});
  }).catch(next);
}
