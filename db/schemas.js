module.exports = {
  submissions: {
    "TableName": process.env.NODE_ENV == 'production' ? 'submission' : 'submissionsStaging',
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
    "TableName": process.env.NODE_ENV == 'production' ? 'captions' : 'captionsStaging',
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
}
