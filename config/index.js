const AWS         = require('aws-sdk');
const environment = process.env.NODE_ENV || 'development';

module.exports = Object.assign({
  baseUrl: 'https://superserious.ngrok.io',
  awsRegion: 'eu-west-1',
  submissionsTableName: 'submissionsStaging',
  captionsTableName: 'captionsStaging',
  usersTableName: 'usersStaging',
}, require(`./${environment}`));

AWS.config.update({
  accessKeyId: 'AKIAJQKOUQXLVMDYGWHQ',
  secretAccessKey: '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',
  region:      module.exports.awsRegion,
});

module.exports.AWS = AWS;
