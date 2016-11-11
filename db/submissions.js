const config         = require('../config');
const promisify      = require('bluebird').Promise.promisify;
const client         = new config.AWS.DynamoDB.DocumentClient();
const lowLevelClient = new config.AWS.DynamoDB();
const tableName      = config.submissionsTableName;

module.exports = {
  create: create,
  all: all,
  latest: latest,
  get: get,
  pick: pick,
  unpicked: unpicked,
  count: count,
}

client.query         = promisify(client.query, {context:                 client});
client.put           = promisify(client.put, {context:                   client});
client.get           = promisify(client.get, {context:                   client});
client.scan          = promisify(client.scan, {context:                  client});
client.update        = promisify(client.update, {context:                client});
client.describeTable = promisify(lowLevelClient.describeTable, {context: lowLevelClient});

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

function latest() {
  return client.query({
    TableName: tableName,
    IndexName: 'isPublished-publishedAt',
    KeyConditionExpression: 'isPublished = :isPublished',
    ScanIndexForward: false,
    Limit: 1,
    ExpressionAttributeValues: {
      ':isPublished': 'yes',
    },
  }).then(function(payload) {
    return payload.Items && payload.Items[0];
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

function count() {
  return client.describeTable({TableName: tableName}).then(function(payload) {
    return payload && payload.Table && payload.Table.ItemCount;
  })
}
