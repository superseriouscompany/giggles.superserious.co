const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      'us-west-2',
});

const dynamodb = new AWS.DynamoDB();

module.exports = dynamodb;
