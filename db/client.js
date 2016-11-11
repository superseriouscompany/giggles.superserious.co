const AWS = require('aws-sdk');
AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      process.env.NODE_ENV == 'production' ? 'us-west-2' : 'eu-west-1',
});

module.exports = new AWS.DynamoDB();
