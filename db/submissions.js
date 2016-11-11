const AWS       = require('aws-sdk');
const promisify = require('bluebird').Promise.promisify;
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      process.env.NODE_ENV == 'production' ? 'us-west-2' : 'eu-west-1',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = 'submissionsStaging';

module.exports = {
  create: create,
  all: all,
  get: get,
  pick: pick,
  unpicked: unpicked,
}

function all() {
  return promisify(client.query, {context: client})({
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
  return promisify(client.put, {context: client})({
    TableName: tableName,
    Item: submission,
  })
}

function get(id) {
  return promisify(client.get, {context: client})({
    TableName: tableName,
    Key: {
      id: id
    }
  }).then(function(payload) {
    return payload && payload.Item;
  });
}

function unpicked() {
  return promisify(client.scan, {context: client})({
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
  return promisify(client.update, {context: client})({
    TableName: tableName,
    Key: { id: id },
    UpdateExpression: 'set isPublished = :true, publishedAt = :publishedAt',
    ExpressionAttributeValues: {
      ':true': 'yes',
      ':publishedAt': now,
    }
  });
}
