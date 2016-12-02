'use strict';

const db   = require('../db/users');
const UUID = require('uuid');

module.exports = function(app) {
  app.post('/ios/pushTokens', iOSRegisterToken);
  app.post('/android/pushTokens', androidRegisterToken);
}

function iOSRegisterToken(req, res, next) {
  if( !req.body.token ) {
    return res.status(400).json({message: 'Please supply a firebase token'});
  }

  const uuid = UUID.v1();

  db.create({
    id: uuid,
    deviceId: req.get('x-device-id'),
    token: req.body.token,
    platform: 'iOS',
  }).then(function() {
    res.status(201).json({id: uuid});
  }).catch(next);
}

function androidRegisterToken(req, res, next) {
  if( !req.body.token ) {
    return res.status(400).json({message: 'Please supply a firebase token'});
  }

  const uuid = UUID.v1();

  db.create({
    id: uuid,
    deviceId: req.get('x-device-id'),
    token: req.body.token,
    platform: 'Android',
  }).then(function() {
    res.status(201).json({id: uuid});
  }).catch(next);
}
