const request = require('request-promise');

module.exports = {
  topic: function(topic, body) {
    request.post('https://fcm.googleapis.com/fcm/send', {
      headers: {
        'Authorization': 'key=AIzaSyBJjn_QRp0uoX6BQxW9HuBx70jNp-6oRFI',
      },
      body: {
        to: `/topics/${topic}`,
        notification: { body: body },
        priority: 'high', //http://stackoverflow.com/questions/37899712/fcm-background-notifications-not-working-in-ios
      },
      json: true,
    })
  }
}
