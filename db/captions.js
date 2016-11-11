const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      process.env.NODE_ENV == 'production' ? 'us-west-2' : 'eu-west-1',
});

const client    = new AWS.DynamoDB.DocumentClient();
const tableName = 'captionsStaging';

module.exports = {
  create: create,
  forSubmission: forSubmission,
  get: get,
  like: like,
  hate: hate,
}

function forSubmission(submissionId, cb) {
  return new Promise(function(resolve, reject) {
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

    function cb(err, data) {
      if( err ) { return reject(err); }
      resolve(data);
    }
  })
}

function create(caption, cb) {
  return new Promise(function(resolve, reject) {
    client.put({
      TableName: tableName,
      Item: caption
    }, cb);

    function cb(err, data) {
      if( err ) { return reject(err) }
      resolve(data);
    }
  });
}

function get(id, cb) {
  return new Promise(function(resolve, reject) {
    client.get({
      TableName: tableName,
      Key: {
        id: id
      }
    }, function(err, payload) {
      if( err ) { return cb(err); }
      return cb(null, payload.Item);
    });

    function cb(err, data) {
      if( err ) { return reject(err) }
      resolve(data);
    }
  })
}

function like(id) {
  return new Promise(function(resolve, reject) {
    client.update({
      TableName: tableName,
      Key: { id: id },
      UpdateExpression: 'set likes = likes + :inc, score = score + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
      }
    }, function(err, data) {
      return cb(err, data);
    })

    function cb(err, data) {
      if( err ) { return reject(err) }
      resolve(data);
    }
  })
}

function hate(id) {
  return new Promise(function(resolve, reject) {
    client.update({
      TableName: tableName,
      Key: { id: id },
      UpdateExpression: 'set hates = hates + :inc, score = score - :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
      }
    }, function(err, data) {
      return cb(err, data);
    })

    function cb(err, data) {
      if( err ) { return reject(err) }
      resolve(data);
    }
  })
}
