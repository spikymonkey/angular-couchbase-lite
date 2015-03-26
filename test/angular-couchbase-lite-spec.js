/*global window, jasmine, angular, module, inject, document, describe, it, before, beforeEach, after, afterEach, runs, expect, console */

describe('Angular Couchbase Lite', function () {
  "use strict";

  // Polyfill Function.bind for PhantomJS
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
            aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();

      return fBound;
    };
  }


  var $httpBackend,
      $browser,
      url = "my.couchbase.lite",
      cbliteUrl = "http://username:password@" + url + "/",
      restUrl = "http://username@" + url,
      syncUrl = "http://my.sync.gateway/sync-db",
      dbname = "my-database",
      cblite;

  window.cblite = {
    getURL: function (callback) {
      callback(null, cbliteUrl);
    }
  };

  function expectedHeaders(headers) {
    // Always expect the Authorization header to be set
    return headers.Authorization === "Basic dXNlcm5hbWU6cGFzc3dvcmQ=";
  }

  beforeEach(function () {
    jasmine.addMatchers({
      toCauseTestFailure: function (util) {
        return {
          compare: function (actual, expected) {
            return {
              pass: false
            };
          }
        };
      },
      toContainAll: function (util) {
        return {
          compare: function (actual, expected) {
            return {
              pass: angular.equals(expected, actual)
            };
          }
        };
      }
    });
  });

  beforeEach(module('cblite'));

  beforeEach(inject(function ($injector, _cblite_) {
    $httpBackend = $injector.get('$httpBackend');
    $browser = $injector.get('$browser')
    cblite = _cblite_;

    // Create the event.
    var event = document.createEvent('Event');
    event.initEvent('deviceready', true, true);
    document.dispatchEvent(event);
  }));

  afterEach(function () {
//    try {
//      $browser.defer.flush(); 
//    } catch( e ) {  }
//    for (var i = 0; i < 10; i++) {
//      try {
//        $httpBackend.flush();
//      } catch (e) {}
//      try {
//        $browser.defer.flush();
//      } catch (e) {}
//    }
    // $httpBackend.verifyNoOutstandingExpectation();
    // $httpBackend.verifyNoOutstandingRequest();
//    $scope.digest();
  });

  describe('server', function (done) {
    it('can be queried for meta-information', function () {
      var response = {
        "couchdb" : "Welcome",
        "CouchbaseLite" : "Welcome",
        "version" : "1.485"
      };

      $httpBackend.expectGET(restUrl, expectedHeaders)
        .respond(200, response);

      cblite.info()
        .then(function (info) {
          console.log(info);
          expect(info).toContainAll(response);
          done();
        });
    });

    it('can be queried for active tasks', function (done) {
      var response = [{
        "progress": 0,
        "target":   syncUrl + "/" + dbname,
        "source":   dbname,
        "type":     "Replication",
        "status":   "Processed 0 / 0 changes",
        "task":     "repl001"
      }];

      $httpBackend.expectGET(restUrl + "/_active_tasks", expectedHeaders)
        .respond(200, response);

      cblite.activeTasks()
        .then(function (tasks) {
          expect(tasks.length).toBe(1);
          expect(tasks[0]).toContainAll(response[0]);
          done();
        });
      
      $httpBackend.flush();
    });

    it('can be queried for all databases', function (done) {
      var response = ["_replicator", "dbA", "dbB", "dbC"];

      $httpBackend.expectGET(restUrl + "/_all_dbs", expectedHeaders).respond(200, response);

      cblite.allDatabases()
        .then(function (databases) {
          var responseIndex = 0;

          expect(databases.length).toEqual(response.length);

          for (var i = 0; i < databases.length; i++) {
            var database = databases[i];
            expect(database.name).toBeDefined();
            expect(database.name()).toEqual(response[responseIndex++]);
          }

          done();
        });
      
      $httpBackend.flush()
    });

    it('can be queried for user databases', function (done) {
      var response = ["_replicator", "dbA", "dbB", "dbC"];
      var userDatabaseNames = response.slice(1);

      $httpBackend.expectGET(restUrl + "/_all_dbs", expectedHeaders).respond(200, response);

      cblite.userDatabases()
        .then(function(databases) {
          var userDatabaseIndex = 0;

          expect(databases.length).toEqual(userDatabaseNames.length);

          for (var i = 0; i < databases.length; i++) {
            var database = databases[i];
            expect(database.name).toBeDefined();
            expect(database.name()).toEqual(userDatabaseNames[userDatabaseIndex++]);
          }

          done();
        });
      
      $httpBackend.flush();
    });
  });

  describe('databases', function () {
    it('can be queried for information', function (done) {
      var response = {
        "instance_start_time" : 1386620242527997,
        "committed_update_seq" : 25800,
        "disk_size" : 15360000,
        "purge_seq" : 0,
        "db_uuid" : "65FB16DF-FFD7-4514-9E8D-B734B066D28D",
        "doc_count" : 5048,
        "db_name" : dbname,
        "update_seq" : 25800,
        "disk_format_version" : 11
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).info()
        .then(function(result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it("can't be queried for information if they don't exist", function (done) {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

      cblite.database(dbname).info()
        .catch(function(error) {
          expect(error.data).toContainAll(response);
          done();
        });

      $httpBackend.flush();
    });

    it('that exist can be tested for existence', function (done) {
      var response = {
        "instance_start_time" : 1386620242527997,
        "committed_update_seq" : 25800,
        "disk_size" : 15360000,
        "purge_seq" : 0,
        "db_uuid" : "65FB16DF-FFD7-4514-9E8D-B734B066D28D",
        "doc_count" : 5048,
        "db_name" : dbname,
        "update_seq" : 25800,
        "disk_format_version" : 11
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).checkIfExists()
        .then(function(exists) {
          expect(exists).toBe(true);
          done();
        });
      
      $httpBackend.flush();
    });

    it("that don't exist can be tested for existence", function (done) {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

      cblite.database(dbname).checkIfExists()
        .then(function(exists) {
          expect(exists).toBe(false);
        done();
        });
      
      $httpBackend.flush();
    });

    it('can be created', function (done) {
      var response = {ok: true};
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).create()
        .then(function(result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it("can't be created again", function (done) {
      var response = {
        "status" : 412,
        "error" : "file_exists"
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(412, response);

      cblite.database(dbname).create().then(
        function (unexpectedSuccess) {
          expect(unexpectedSuccess).toCauseTestFailure();
          done();
        },
        function(error) {
          expect(error.data).toContainAll(response);
          done();
        });

      $httpBackend.flush();
    });

    it("can be lazily created/fetched when they already exist", function (done) {
      var existenceResponse = {
        "instance_start_time" : 1386620242527997,
        "committed_update_seq" : 25800,
        "disk_size" : 15360000,
        "purge_seq" : 0,
        "db_uuid" : "65FB16DF-FFD7-4514-9E8D-B734B066D28D",
        "doc_count" : 5048,
        "db_name" : dbname,
        "update_seq" : 25800,
        "disk_format_version" : 11
      };
      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders).respond(200, existenceResponse);

      cblite.database(dbname).createIfMissing()
        .then(function(result) {
          expect(result).toContainAll(existenceResponse);
          done();
        });
      
      $httpBackend.flush();
    });

    it("can be lazily created/fetched when they don't already exist", function (done) {
      var existenceResponse = {
        "status" : 404,
        "error" : "not_found"
      };
      var creationResponse = {ok: true};

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders).respond(404, existenceResponse);
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders).respond(200, creationResponse);

      cblite.database(dbname).createIfMissing()
        .then(function(result) {
          expect(result).toContainAll(creationResponse);
          done();
        });
      
      $httpBackend.flush();
    });

    it("can be queried for changes", function (done) {
      var response = {
        "results" : [
          {
            "seq" : 1,
            "id" : "A329CFEC-29E8-4DCF-BB49-EFCE8CD6B212",
            "changes" : [
              {
                "rev" : "1-afbf905396a144446feb2431c37065f9"
              }
            ]
          },
          {
            "seq" : 2,
            "id" : "209BB170-C1E0-473E-B3C4-A4533ACA3CDD",
            "changes" : [
              {
                "rev" : "1-ed0ebedd2fab89227b352f6455a08010"
              }
            ]
          }
        ],
        "last_seq" : 2
      };

      $httpBackend.expectGET(restUrl + "/" + dbname + "/_changes?feed=continuous&limit=7", expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).changes({feed: 'continuous', limit: 7}).then(
        function (result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });
  });

  describe('documents', function () {
    it('can be fetched', function (done) {
      var documentId = "document";
      var queryParams = {attachments: true, conflicts: true};
      var response = {
        "_id" : documentId,
        "_rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        foo: "bar"
      };
      $httpBackend.expectGET(restUrl + "/" + dbname + "/" + documentId + "?attachments=true&conflicts=true", expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).document(documentId).load(queryParams)
        .then(function(result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it('can not be saved with invalid content', function() {
      expect(cblite.database(dbname).document('document').save.bind(null))
        .toThrow("You can't save this type: undefined");
      expect(cblite.database(dbname).document('document').save.bind(null, null))
        .toThrow("You can't save a null document");
      expect(cblite.database(dbname).document('document').save.bind(null, 15))
        .toThrow("You can't save this type: number");
      expect(cblite.database(dbname).document('document').save.bind(null, true))
        .toThrow("You can't save this type: boolean");
      expect(cblite.database(dbname).document('document').save.bind(null, function() {}))
        .toThrow("You can't save this type: function");
    });

    it('can be saved with an id passed explicitly to save()', function(done) {
      var documentId = "document";
      var document = {
        foo: "bar"
      };
      var response = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, document, expectedHeaders)
        .respond(201, response);

      cblite.database(dbname).document(documentId).save(document)
        .then(function(result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it('can be saved with an id extracted from the document', function(done) {
      var documentId = "document";
      var document = {
        _id: documentId,
        foo: "bar"
      };
      var response = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, document, expectedHeaders)
        .respond(201, response);

      cblite.database(dbname).document().save(document)
        .then(function(result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it('can be saved without an id, allowing the server to generate one for us', function(done) {
      var documentId = "209BB170-C1E0-473E-B3C4-A4533ACA3CDD";
      var content1 = {
        foo: "bar"
      };
      var response1 = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      var content2 = {
        foo: "bar",
        bar: "baz"
      };
      var response2 = {
        "id" : documentId,
        "rev" : "1-5101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };

      $httpBackend.expectPOST(restUrl + "/" + dbname, content1, expectedHeaders)
        .respond(201, response1);
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId, content2, expectedHeaders)
        .respond(201, response2);

      var document = cblite.database(dbname).document();
      document.save(content1)
        .then(function(result) {
          expect(result).toContainAll(response1);

          // Save again and we should now be reusing the id from last time
          return document.save(content2)
            .then(function(result) {
              expect(result).toContainAll(response2);
              done();
            });
        });
      
      $httpBackend.flush();
    });
  });

  describe('one-off replication', function () {
    it("can be initiated from local -> remote", function (done) {
      var request = {
        source: dbname,
        target: syncUrl,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).replicateTo(syncUrl).then(function (result) {
        expect(result).toContainAll(response);
        done();
      });
      
      $httpBackend.flush();
    });

    it("local -> remote failures are reported", function (done) {
      var request = {
        source: dbname,
        target: syncUrl,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": false
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(401, response);

      cblite.database(dbname).replicateTo(syncUrl).then(
        function (unexpectedSuccess) {
          expect(unexpectedSuccess).toCauseTestFailure();
          done();
        },
        function (error) {
          expect(error.data).toContainAll(response);
          done();
        });

      $httpBackend.flush();
    });

    it("can be initiated from remote -> local", function (done) {
      var request = {
        source: syncUrl,
        target: dbname,
        continuous: false
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).replicateFrom(syncUrl)
        .then(function (result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it("remote -> local failures are reported", function (done) {
      var request = {
        source: syncUrl,
        target: dbname,
        continuous: false
      };
      var response = {
        "ok": false
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(401, response);

      cblite.database(dbname).replicateFrom(syncUrl).then(
        function (unexpectedSuccess) {
          expect(unexpectedSuccess).toCauseTestFailure();
          done();
        },
        function (error) {
          expect(error.data).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });
  });

  describe('continuous replication', function () {
    it("can be initiated from local -> remote", function (done) {
      var request = {
        source: dbname,
        target: syncUrl,
        continuous: true
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname)
        .replicateTo({url: syncUrl, continuous: true})
        .then(function (result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });

    it("can be initiated from remote -> local", function (done) {
      var request = {
        source: syncUrl,
        target: dbname,
        continuous: true
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname)
        .replicateFrom({url: syncUrl, continuous: true})
        .then(function (result) {
          expect(result).toContainAll(response);
          done();
        });
      
      $httpBackend.flush();
    });
  });

  describe('replication requiring headers', function () {
    it("can be initiated from local -> remote", function (done) {
      var request = {
        source: dbname,
        target: syncUrl,
        continuous: true,
        headers: {Cookie: "SyncGatewaySession=9c837dddb656d7d55ae0a326b77faa5482fbc7fb"}
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).replicateTo({
        url: syncUrl,
        continuous: true,
        headers: {Cookie: "SyncGatewaySession=9c837dddb656d7d55ae0a326b77faa5482fbc7fb"}
      }).then(function (result) {
        expect(result).toContainAll(response);
        done();
      });

      $httpBackend.flush();
    });

    it("can be initiated from remote -> local", function (done) {
      var request = {
        source: syncUrl,
        target: dbname,
        continuous: true,
        headers: {Cookie: "SyncGatewaySession=9c837dddb656d7d55ae0a326b77faa5482fbc7fb"}
      };
      var response = {
        "session_id": "repl001",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", request, expectedHeaders)
        .respond(200, response);

      cblite.database(dbname).replicateFrom({
          url: syncUrl,
          continuous: true,
          headers: {Cookie: "SyncGatewaySession=9c837dddb656d7d55ae0a326b77faa5482fbc7fb"}
        }).then(function (result) {
          expect(result).toContainAll(response);
          done();
      });
      
      $httpBackend.flush();
    });
  });

  describe('one-off sync', function () {
    it("can be initiated", function (done) {
      var localToRemoteRequest = {
        source: dbname,
        target: syncUrl,
        continuous: false
      };
      var localToRemoteResponse = {
        "session_id": "repl001",
        "ok": true
      };
      var remoteToLocalRequest = {
        source: syncUrl,
        target: dbname,
        continuous: false
      };
      var remoteToLocalResponse = {
        "session_id": "repl002",
        "ok": true
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
        .respond(200, localToRemoteResponse);
      $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
        .respond(200, remoteToLocalResponse);

      cblite.database(dbname).syncWith(syncUrl)
        .then(function (result) {
          expect(result.localToRemote).toContainAll(localToRemoteResponse);
          expect(result.remoteToLocal).toContainAll(remoteToLocalResponse);
          done();
        });
      
      $httpBackend.flush();
    });

    it("local -> remote leg failures are reported", function (done) {
      var localToRemoteRequest = {
        source: dbname,
        target: syncUrl,
        continuous: false
      };
      var localToRemoteResponse = {
        "session_id": "repl001"
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
        .respond(401, localToRemoteResponse);

      cblite.database(dbname).syncWith(syncUrl).then(
        function (unexpectedSuccess) {
          expect(unexpectedSuccess).toCauseTestFailure();
          done();
        },
        function (error) {
          expect(error.localToRemote.data).toContainAll(localToRemoteResponse);
          done();
        });
      
      $httpBackend.flush();
    });

    it("remote -> local replication leg failures are reported", function (done) {
      var localToRemoteRequest = {
        source: dbname,
        target: syncUrl,
        continuous: false
      };
      var localToRemoteResponse = {
        "session_id": "repl001",
        "ok": true
      };
      var remoteToLocalRequest = {
        source: syncUrl,
        target: dbname,
        continuous: false
      };
      var remoteToLocalResponse = {
        "session_id": "repl002"
      };
      $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
        .respond(200, localToRemoteResponse);
      $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
        .respond(401, remoteToLocalResponse);

      cblite.database(dbname).syncWith(syncUrl).then(
        function (unexpectedSuccess) {
          expect(unexpectedSuccess).toCauseTestFailure();
          done();
        },
        function (error) {
          expect(error.localToRemote).toContainAll(localToRemoteResponse);
          expect(error.remoteToLocal.data).toContainAll(remoteToLocalResponse);
          done();
        });

      $httpBackend.flush();
    });
  });

  describe('continuous sync', function () {
      it("can be initiated", function (done) {
        var localToRemoteRequest = {
          source: dbname,
          target: syncUrl,
          continuous: true
        };
        var localToRemoteResponse = {
          "session_id": "repl001",
          "ok": true
        };
        var remoteToLocalRequest = {
          source: syncUrl,
          target: dbname,
          continuous: true
        };
        var remoteToLocalResponse = {
          "session_id": "repl002",
          "ok": true
        };
        $httpBackend.expectPOST(restUrl + "/_replicate", localToRemoteRequest, expectedHeaders)
          .respond(200, localToRemoteResponse);
        $httpBackend.expectPOST(restUrl + "/_replicate", remoteToLocalRequest, expectedHeaders)
          .respond(200, remoteToLocalResponse);

        cblite.database(dbname).syncWith({url: syncUrl, continuous: true})
          .then(function (result) {
            expect(result.localToRemote).toContainAll(localToRemoteResponse);
            expect(result.remoteToLocal).toContainAll(remoteToLocalResponse);
            done();
          });
        
        $httpBackend.flush();
      });
    });
});
