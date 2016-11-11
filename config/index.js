const AWS         = require('aws-sdk');
const environment = process.env.NODE_ENV || 'development';

module.exports = Object.assign({
  baseUrl: 'https://superserious.ngrok.io',
  awsRegion: 'eu-west-1',
  submissionsTableName: 'submissionsStaging',
  captionsTableName: 'captionsStaging',
  // defaults go here
}, require(`./${environment}`));

AWS.config.update({
  credentials: new AWS.SharedIniFileCredentials({profile: 'gigglesDynamo'}),
  region:      module.exports.awsRegion,
});

module.exports.AWS = AWS;
