const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      'us-west-2',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = 'captionsStaging';

module.exports = {
  create: create,

  forSubmission: forSubmission,

  get: get,

  addLike: addLike,

  addHate: addHate,
}

function forSubmission(submissionId, cb) {
  client.query({
    TableName: tableName,
    IndexName: 'submissionId-score',
    KeyConditionExpression: 'submissionId = :submissionId',
    ScanIndexForward: false,
    Limit: 1000,
    ExpressionAttributeValues: {
      ':submissionId': submissionId,
    }
  }, function(err, payload) {
    if( err ) { return cb(err); }
    return cb(null, payload.Items);
  });
}

function create(caption, cb) {
  client.put({
    TableName: tableName,
    Item: caption
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

function addLike(id) {

}

function addHate(id) {

}
