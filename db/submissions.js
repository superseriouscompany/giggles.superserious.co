const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      'us-west-2',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = 'submissionsStaging';

module.exports = {
  create: create,

  all: all,

  get: get,
}

function all(cb) {
  client.query({
    TableName: tableName,
    IndexName: 'isPublished-publishedAt',
    KeyConditionExpression: 'isPublished = :isPublished',
    ScanIndexForward: false,
    Limit: 365,
    ExpressionAttributeValues: {
      ':isPublished': 'yes',
    }
  }, function(err, payload) {
    if( err ) { return cb(err); }
    return cb(null, payload.Items);
  });
}

function create(submission, cb) {
  client.put({
    TableName: tableName,
    Item: submission
  }, cb);
}

function get(id, cb) {
  client.get({
    TableName: tableName,
    Key: {
      id: id
    }
  }, function(err, payload) {
    if( err ) { return cb(err); }
    return cb(null, payload.Item);
  });
}
