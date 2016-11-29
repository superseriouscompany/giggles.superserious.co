const config         = require('../config');
const promisify      = require('bluebird').Promise.promisify;
const client         = new config.AWS.DynamoDB.DocumentClient();
const tableName      = config.usersTableName;

module.exports = {
  create: create,
  findByDeviceId: findByDeviceId,
  get: get,
}

client.put   = promisify(client.put, {context:   client});
client.query = promisify(client.query, {context: client});
client.get   = promisify(client.get, {context:   client});

function create(user) {
  return findByDeviceId(user.deviceId).then(function(existingUser) {
    if( existingUser ) { user.id = existingUser.id; }
  }).then(function() {
    return client.put({
      TableName: tableName,
      Item: user
    });
  })
}

function findByDeviceId(deviceId) {
  return client.query({
    TableName: tableName,
    IndexName: 'deviceId',
    KeyConditionExpression: 'deviceId = :deviceId',
    Limit: 1,
    ExpressionAttributeValues: {
      ':deviceId': deviceId,
    },
  }).then(function(payload) {
    return payload.Items && payload.Items[0];
  })
}

function get(id) {
  return client.get({
    TableName: tableName,
    Key: {
      id: id
    }
  }).then(function(payload) {
    return payload.Item;
  })
}
