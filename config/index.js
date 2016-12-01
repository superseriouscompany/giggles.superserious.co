const AWS         = require('aws-sdk');
const environment = process.env.NODE_ENV || 'development';

module.exports = Object.assign({
  baseUrl: 'https://superserious.ngrok.io',
  awsRegion: 'eu-west-1',
  submissionsTableName: 'submissionsStaging',
  captionsTableName: 'captionsStaging',
  usersTableName: 'usersStaging',
  submissionsBucket: 'giggles-staging-submissions',
  captionsBucket: 'giggles-staging-captions',
}, require(`./${environment}`));

AWS.config.update({
  accessKeyId:     'AKIAIAOZKV3EO6FRFXMQ',
  secretAccessKey: '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',
  region:          module.exports.awsRegion,
});

module.exports.AWS = AWS;
