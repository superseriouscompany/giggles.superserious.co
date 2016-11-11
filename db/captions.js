const AWS       = require('aws-sdk');
const promisify = require('bluebird').Promise.promisify;
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      process.env.NODE_ENV == 'production' ? 'us-west-2' : 'eu-west-1',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.NODE_ENV == 'production' ? 'captions' : 'captionsStaging';

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
    }
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
