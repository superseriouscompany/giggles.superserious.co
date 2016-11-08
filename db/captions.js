const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      'us-west-2',
});

const client = new AWS.DynamoDB.DocumentClient();
