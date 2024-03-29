const config = require('../config');

module.exports = {
  submissions: {
    "TableName": config.submissionsTableName,
    "AttributeDefinitions":[
      {
        "AttributeName":"id",
        "AttributeType":"S"
      },
      {
        "AttributeName":"isPublished",
        "AttributeType":"S"
      },
      {
        "AttributeName":"publishedAt",
        "AttributeType":"N"
      }
    ],
    "KeySchema":[
      {
        "AttributeName":"id",
        "KeyType":"HASH"
      }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits":5,
      "WriteCapacityUnits":5
    },
    "GlobalSecondaryIndexes":[
      {
        "IndexName": "isPublished-publishedAt",
        "KeySchema": [
          {
            "AttributeName": "isPublished",
            "KeyType": "HASH",
          },
          {
            "AttributeName": "publishedAt",
            "KeyType": "RANGE",
          },
        ],
        "Projection": {
          "ProjectionType": "ALL",
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5,
        }
      }
    ],
  },

  captions: {
    "TableName": config.captionsTableName,
    "AttributeDefinitions":[
      {
        "AttributeName":"id",
        "AttributeType":"S"
      },
      {
        "AttributeName":"submissionId",
        "AttributeType":"S"
      },
      {
        "AttributeName":"score",
        "AttributeType":"N"
      }
    ],
    "KeySchema":[
      {
        "AttributeName":"id",
        "KeyType":"HASH"
      }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits":5,
      "WriteCapacityUnits":5
    },
    "GlobalSecondaryIndexes":[
      {
        "IndexName": "submissionId-score",
        "KeySchema": [
          {
            "AttributeName": "submissionId",
            "KeyType": "HASH",
          },
          {
            "AttributeName": "score",
            "KeyType": "RANGE",
          },
        ],
        "Projection": {
          "ProjectionType": "ALL",
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5,
        }
      }
    ],
  },

  users: {
    "TableName": config.usersTableName,
    "AttributeDefinitions":[
      {
        "AttributeName":"id",
        "AttributeType":"S",
      },
      {
        "AttributeName":"deviceId",
        "AttributeType":"S",
      }
    ],
    "KeySchema":[
      {
        "AttributeName":"id",
        "KeyType":"HASH"
      }
    ],
    "GlobalSecondaryIndexes":[
      {
        "IndexName": "deviceId",
        "KeySchema": [
          {
            "AttributeName": "deviceId",
            "KeyType": "HASH",
          },
        ],
        "Projection": {
          "ProjectionType": "ALL",
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5,
        }
      }
    ],
    "ProvisionedThroughput": {
      "ReadCapacityUnits":5,
      "WriteCapacityUnits":5
    },
  },
}
