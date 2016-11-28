const config    = require('../config');
const promisify = require('bluebird').Promise.promisify;
const client    = new config.AWS.DynamoDB.DocumentClient();
const tableName = config.captionsTableName;

module.exports = {
  create: create,
  forSubmission: forSubmission,
  get: get,
  like: like,
  hate: hate,
}

client.query  = promisify(client.query, {context:  client});
client.put    = promisify(client.put, {context:    client});
client.get    = promisify(client.get, {context:    client});
client.update = promisify(client.update, {context: client});

function forSubmission(submissionId) {
  return client.query({
    TableName: tableName,
    IndexName: 'submissionId-score',
    KeyConditionExpression: 'submissionId = :submissionId',
    ScanIndexForward: false,
    Limit: 1000,
    ExpressionAttributeValues: {
      ':submissionId': submissionId,
    }
  }).then(function(payload) {
    return payload.Items;
  })
}

function create(caption) {
  return client.put({
    TableName: tableName,
    Item: caption
  });
}

function get(id, cb) {
  return client.get({
    TableName: tableName,
    Key: {
      id: id
    }
  }).then(function(payload) {
    return payload.Item;
  })
}

function like(id) {
  return client.update({
    TableName: tableName,
    Key: { id: id },
    UpdateExpression: 'set likes = likes + :inc, score = score + :inc',
    ExpressionAttributeValues: {
      ':inc': 1,
    },
    ReturnValues: 'ALL_OLD',
  });
}

function hate(id) {
  return client.update({
    TableName: tableName,
    Key: { id: id },
    UpdateExpression: 'set hates = hates + :inc, score = score - :inc',
    ExpressionAttributeValues: {
      ':inc': 1,
    }
  });
}
