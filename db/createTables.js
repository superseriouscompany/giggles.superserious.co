const client  = require('./client');
const schemas = require('./schemas');

client.createTable(schemas.submissions, function(err) {
  if( err ) {
    if( err.code == 'ResourceInUseException' ) {
      return console.log("Submissions table already exists.");
    }
    throw err;
  }

  console.log("Created submissions table.");
})

client.createTable(schemas.captions, function(err) {
  if( err ) {
    if( err.code == 'ResourceInUseException' ) {
      return console.log("Captions table already exists.");
    }
    throw err;
  }

  console.log("Created captions table.");
})

client.createTable(schemas.users, function(err) {
  if( err ) {
    if( err.code == 'ResourceInUseException' ) {
      return console.log("Users table already exists.");
    }
    throw err;
  }

  console.log("Created users table.");
})
