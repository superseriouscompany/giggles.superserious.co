const AWS       = require('aws-sdk');
const promisify = require('bluebird').Promise.promisify;
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      process.env.NODE_ENV == 'production' ? 'us-west-2' : 'eu-west-1',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.NODE_ENV == 'production' ? 'submissions' : 'submissionsStaging';

module.exports = {
  create: create,
  all: all,
  get: get,
  pick: pick,
  unpicked: unpicked,
}

client.query  = promisify(client.query, {context:  client});
client.put    = promisify(client.put, {context:    client});
client.get    = promisify(client.get, {context:    client});
client.scan   = promisify(client.scan, {context:   client});
client.update = promisify(client.update, {context: client});

function all() {
  return client.query({
    TableName: tableName,
    IndexName: 'isPublished-publishedAt',
    KeyConditionExpression: 'isPublished = :isPublished',
    ScanIndexForward: false,
    Limit: 365,
    ExpressionAttributeValues: {
      ':isPublished': 'yes',
    },
  }).then(function(payload) {
    return payload.Items;
  })
}

function create(submission) {
  return client.put({
    TableName: tableName,
    Item: submission,
  })
}

function get(id) {
  return client.get({
    TableName: tableName,
    Key: {
      id: id
    }
  }).then(function(payload) {
    return payload && payload.Item;
  });
}

function unpicked() {
  return client.scan({
    TableName: tableName,
  }).then(function(payload) {
    return payload && payload.Items;
  }).then(function(submissions) {
    if( !submissions || !submissions.length ) { return null; }
    return submissions[Math.floor(Math.random()*submissions.length)].id;
  })
}

function pick(id) {
  const now = +new Date;
  return client.update({
    TableName: tableName,
    Key: { id: id },
    UpdateExpression: 'set isPublished = :true, publishedAt = :publishedAt',
    ExpressionAttributeValues: {
      ':true': 'yes',
      ':publishedAt': now,
    }
  });
}
