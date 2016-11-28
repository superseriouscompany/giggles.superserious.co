'use strict';

const fs      = require('fs');
const expect  = require('expect');
const stub    = require('./stub');
const api     = require('./api');
const factory = require('./factory');

describe("giggles api", function () {
  this.timeout(10000); // dynamodb latency :eyeroll:
  this.slow(2000);

  let stubHandle;

  before(function() {
    stubHandle = stub(3001);

    return api('/').catch(function(err) {
      console.error(`API is not running at ${api.baseUrl}`);
      process.exit(1);
    })
  });

  after(function() {
    stubHandle();
  });

  describe('submission', function() {
    it("415s if form contains no multipart upload", function () {
      return api.post('/submissions', { submission: {cool: 'nice'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(415);
        expect(err.response.body.message).toEqual("Your `Content-Type` must be `multipart/form-data`.");
      });
    });

    it("400s if no file is present", function () {
      return api.post({ url: '/submissions', formData: {nope: 'nothing'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("You must attach a valid photo in the `photo` field of your multipart request.");
      });
    });

    it("413s if file is too large", function() {
      const formData = {
        photo: fs.createReadStream(__dirname + '/fixtures/massive.jpg'),
      };

      return api.post({ url: '/submissions', formData: formData }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(413);
      })
    });

    it("200s when uploading a valid submission and creates a uuid", function () {
      const formData = {
        photo: fs.createReadStream(__dirname + '/fixtures/photo.jpg'),
      };

      return api.post({ url: '/submissions', formData: formData }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      })
    });

    it("returns a submission once it is chosen", function() {
      let submission;

      return factory.submission().then(function(s) {
        submission = s;
        return api.get('/submissions');
      }).then(function(r) {
        expect(r.statusCode).toEqual(200);
        expect(r.body.submissions.length).toBeGreaterThanOrEqualTo(1);
        expect(r.body.submissions[0].id).toEqual(submission.id);
      })
    })
  });

  describe("caption", function() {
    let submission;

    before(function() {
      return factory.submission().then(function(s) {
        submission = s;
      })
    })

    it("415s if form is not multipart upload", function() {
      return api.post(`/submissions/${submission.id}/captions`, {cool: 'nice'}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(415, err);
      })
    });

    it("400s if file is not present", function() {
      return api.post({ url: `/submissions/${submission.id}/captions`, formData: {nope: 'nothing'}}).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("You must attach a valid aac audio file in the `audio` field of your multipart request.");
      });
    });

    it("413s if file is too large", function() {
      return factory.caption({
        audio: fs.createReadStream(__dirname + '/fixtures/massive.aac'),
      }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(413);
      });
    });

    it("400s if submission id doesn't exist", function() {
      return factory.caption({
        submissionId: 'nope'
      }).then(shouldFail).catch(function(err) {
        expect(err.statusCode).toEqual(400);
        expect(err.response.body.message).toEqual("The submission `nope` does not exist.")
      });
    });

    it("200s when uploading a valid caption and creates a uuid", function() {
      const formData = {
        audio: fs.createReadStream(__dirname + '/fixtures/lawng.aac'),
      }
      return api.post({
        url: `/submissions/${submission.id}/captions`,
        formData: formData
      }).then(function(r) {
        expect(r.statusCode).toEqual(201);
        expect(r.body.id).toExist();
      });
    });

    it("returns a caption once it is added", function() {
      let submission, caption;

      return factory.submission().then(function(s) {
        submission = s;
        return factory.caption({submissionId: s.id})
      }).then(function(c) {
        caption = c;
        return api.get(`/submissions/${submission.id}/captions`)
      }).then(function(r) {
        expect(r.statusCode).toEqual(200);
        expect(r.body.captions.length).toEqual(1, 'there should have been one caption');
        expect(r.body.captions[0].id).toEqual(caption.id);
      })
    })

    it("returns a caption from the latest submission", function () {
      let submission, caption;

      return factory.submission().then(function(s) {
        submission = s;
        return factory.caption({submissionId: s.id})
      }).then(function(c) {
        caption = c;
        return api.get(`/captions`)
      }).then(function(r) {
        expect(r.statusCode).toEqual(200);
        expect(r.body.captions.length).toEqual(1, 'there should have been one caption');
        expect(r.body.captions[0].id).toEqual(caption.id);
      })

    });
  });

  describe("ratings", function() {
    let caption;

    before(function() {
      return factory.caption().then(function(c) { caption = c; })
    })

    describe("likes", function() {
      it("400s if caption is not found", function() {
        return api.post('/captions/nope/like').then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body).toMatch(/doesn't exist/);
        })
      });

      it("204s on success", function() {
        return api.post(`/captions/${caption.id}/like`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      })

      it("notifies the creator", function(done) {
        let submission, deviceToken;

        factory.deviceToken({deviceId: 'abc'}).then(function(dt) {
          deviceToken = dt;
          return factory.caption({deviceId: 'abc'})
        }).then(function(c) {
          return api.post(`/captions/${caption.id}/like?stubPort=3001`);
        }).then(function() {
          setTimeout(function() {
            const call = stubHandle.calls[0];
            expect(call).toExist();
            expect(call.body.notification.body).toEqual('Someone liked your caption. You have value.');
            expect(call.body.to).toEqual(deviceToken);
            done();
          }, 100);
        }).catch(done);
      });

      it("is reflected on caption", function() {
        let caption;
        return factory.caption().then(function(c) {
          caption = c;
          return api.post(`/captions/${caption.id}/like`)
        }).then(function() {
          return api.get(`/submissions/${caption.submissionId}/captions`)
        }).then(function(r) {
          let c = r.body.captions.find(function(c) { return c.id == caption.id; })
          expect(c).toExist("Couldn't find caption");
          expect(c.likes).toEqual(1);
        })
      });
    })

    describe("hates", function() {
      it("400s if caption is not found", function() {
        return api.post('/captions/nope/hate').then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body).toMatch(/doesn't exist/);
        })
      });

      it("204s on success", function() {
        return api.post(`/captions/${caption.id}/hate`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      })

      it("is reflected on caption", function() {
        let caption;
        return factory.caption().then(function(c) {
          caption = c;
          return api.post(`/captions/${caption.id}/hate`)
        }).then(function() {
          return api.get(`/submissions/${caption.submissionId}/captions`)
        }).then(function(r) {
          let c = r.body.captions.find(function(c) { return c.id == caption.id; })
          expect(c).toExist("Couldn't find caption");
          expect(c.hates).toEqual(1);
        })
      });
    })

    it("sorts captions by score", function() {
      let yay, meh, nah, submissionId;

      return factory.submission().then(function(s) {
        submissionId = s.id;
        return Promise.all([
          factory.caption({submissionId: submissionId}),
          factory.caption({submissionId: submissionId}),
          factory.caption({submissionId: submissionId}),
        ]);
      }).then(function(captions) {
        meh = captions[0];
        yay = captions[1];
        nah = captions[2];

        return Promise.all([
          api.post(`/captions/${yay.id}/like`),
          api.post(`/captions/${nah.id}/hate`),
        ])
      }).then(function() {
        return api.get(`/submissions/${submissionId}/captions`).then(function(r) {
          return r.body.captions;
        })
      }).then(function(captions) {
        expect(captions[0].id).toEqual(yay.id);
        expect(captions[1].id).toEqual(meh.id);
        expect(captions[2].id).toEqual(nah.id);
      })
    });
  });

  describe("moderation", function() {
    it("204s for anything", function() {
      return api.post(`/submissions/whatever/report`).then(function(r) {
        expect(r.statusCode).toEqual(204);
      })
    });
  });

  describe("next selection", function() {
    it("400s if queue is empty");
    // flush doesn't work anymore
    // function() {
    //   if( process.env.NODE_ENV == 'production' ) { return true; }
    //   return api({url: '/all', method: 'DELETE'}).then(function() {
    //     return api.post('/next');
    //   }).then(shouldFail).catch(function(err) {
    //     expect(err.statusCode).toEqual(400);
    //     expect(err.response.body.message).toMatch('empty');
    //   })
    // });

    it("selects a random image from the queue", function() {
      let currentSubmission;

      return api.get('/submissions').then(function(r) {
        return r.body.submissions[0];
      }).then(function(cs) {
        currentSubmission = cs;
        return factory.queuedSubmission();
      }).then(function() {
        return api.post('/next')
      }).then(function() {
        return api.get('/submissions').then(function(r) {
          return r.body.submissions[0];
        })
      }).then(function(s) {
        expect(s.id).toExist();
        expect(s.id).toNotEqual(currentSubmission && currentSubmission.id);
      });
    });

    it("notifies firebase topic on selection", function (done) {
      factory.queuedSubmission().then(function() {
        return api.post('/next?stubPort=3001')
      }).then(function() {
        // notify is fire and forget so we need to wait for the call to be received
        setTimeout(function() {
          const call = stubHandle.calls[0];
          expect(call).toExist();
          expect(call.url).toEqual('/fcm/send');
          expect(call.body.to).toEqual('/topics/all');
          expect(call.body.priority).toEqual('high');
          expect(call.body.notification.body).toEqual('Everything is dumb.');
          done();
        }, 100);
      }).catch(done);
    });

    it("selects an image with the given ID", function() {
      let submission;
      return factory.queuedSubmission().then(function(s) {
        submission = s;
        return api.post({
          url: `/next`,
          body: { id: s.id }
        })
      }).then(function() {
        return api.get('/submissions').then(function(r) {
          return r.body.submissions[0]
        });
      }).then(function(s) {
        expect(s.id).toEqual(submission.id);
      })
    });
  });

  describe("registering push tokens", function() {
    describe("iOS", function() {
      it("204s blindly", function () {
        return api.post(`/ios/pushTokens`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      });
    })

    describe("Android", function() {
      it("204s blindly", function () {
        return api.post(`/android/pushTokens`).then(function(r) {
          expect(r.statusCode).toEqual(204);
        })
      });
    })
  })

  describe("jumping the queue", function() {
    describe("iOS", function() {
      let queuedSubmission;

      before(function() {
        return factory.queuedSubmission().then(function(s) {
          queuedSubmission = s;
        })
      })

      it("400s on malformed input", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueue`, {
          body: { garbage: 'trash' }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body.message).toMatch(/receipt/);
        })
      });

      it("410s if submission is not found", function() {
        return api.post(`/submissions/nope/jumpQueue`, {
          body: { receipt: 'anything' }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(410);
        })
      })

      it("403s on receipt validation failure", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueue?stubPort=3001`, {
          body: {
            receipt: 'validReceipt',
            stubBody: {
              status: 21003
            }
          }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(403);
        })
      });

      it("jumps queue on success", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueue?stubPort=3001`, {
          body: {
            receipt: 'validReceipt',
            stubBody: {
              status: 0,
              receipt: {
                in_app: [
                  {
                    product_id: 'com.superserious.giggles.now'
                  }
                ]
              }
            }
          }
        }).then(function(r) {
          expect(r.statusCode).toEqual(204);
          return api.get('/submissions').then(function(r) { return r.body.submissions; });
        }).then(function(submissions) {
          expect(submissions[0].id).toEqual(queuedSubmission.id);
        });
      });
    });

    describe("Android", function() {
      let queuedSubmission;

      before(function() {
        return factory.queuedSubmission().then(function(s) {
          queuedSubmission = s;
        })
      })

      it("400s on malformed input", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueueAndroid`, {
          body: { garbage: 'trash' }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(400);
          expect(err.response.body.message).toMatch('purchaseToken');
        })
      });

      it("410s if submission is not found", function() {
        return api.post(`/submissions/nope/jumpQueueAndroid`, {
          body: { purchaseToken: 'anything'}
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(410);
        });
      });

      it("500s if purchase is cancelled", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueueAndroid?stubPort=3001`, {
          body: {
            purchaseToken: 'realToken',
            stubBody: {
              purchaseState: 1,
              consumptionState: 1,
            }
          }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(500);
        })
      });

      it("500s if IAP is not consumed", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueueAndroid?stubPort=3001`, {
          body: {
            purchaseToken: 'realToken',
            stubBody: {
              purchaseState: 0,
              consumptionState: 0,
            }
          }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(500);
        })
      });

      it("500s on unknown receipt validation failure", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueueAndroid?stubPort=3001&stubStatus=403`, {
          body: {
            purchaseToken: 'badToken',
            stubBody: {
              purchaseState: 0,
              consumptionState: 1
            }
          }
        }).then(shouldFail).catch(function(err) {
          expect(err.statusCode).toEqual(500, err);
        })
      })

      it("jumps queue on success", function() {
        return api.post(`/submissions/${queuedSubmission.id}/jumpQueueAndroid?stubPort=3001`, {
          body: {
            purchaseToken: 'realToken',
            stubBody: {
              purchaseState: 0,
              consumptionState: 1,
            }
          }
        }).then(function(r) {
          expect(r.statusCode).toEqual(204);
          return api.get('/submissions').then(function(r) { return r.body.submissions; });
        }).then(function(submissions) {
          expect(submissions[0].id).toEqual(queuedSubmission.id);
        });
      });
    });
  });
});

function shouldFail(r) {
  let err;
  if( r.statusCode ) {
    err = new Error(`Expected an unsuccessful response, got: ${r.statusCode} ${JSON.stringify(r.body)}`);
    err.statusCode = r.statusCode;
    err.response = { body: r.body };
  } else {
    err = new Error(`Expected an unsuccessful response, got: ${r}`);
    err.statusCode = 420;
  }
  throw err;
}
