describe('Angular Couchbase Lite', function () {

  var $httpBackend;
  var url = "my.couchbase.lite"
  var cbliteUrl = "http://username:password@" + url + "/";
  var restUrl = "http://username@" + url;
  var dbname = "my-database";
  var cblite;

  window.cblite = {
    getURL: function (callback) {
      callback(null, cbliteUrl);
    }
  };

  beforeEach(function () {
    this.addMatchers({
      toContainAll: function (expected) {
        var property;
        for (property in expected) {
          if (this.actual.hasOwnProperty(property) && this.actual[property] !== expected[property]) {
            return false;
          }
        }
        return true;
      }
    });
  });


  beforeEach(module('cblite'));

  beforeEach(inject(function($injector, _cblite_) {
    $httpBackend = $injector.get('$httpBackend');
    cblite = _cblite_;
    document.dispatchEvent(new Event('deviceready'));
  }));

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('server', function() {
    it('can be queried for meta-information', function() {
      var response = {
        "couchdb" : "Welcome",
        "CouchbaseLite" : "Welcome",
        "version" : "1.485"
      };

      $httpBackend.expectGET(restUrl).respond(200, response);

      runs(function() {
        return cblite.info()
          .then(function(info) {
            expect(info).toContainAll(response);
          });
      });
    })
  });

  describe('databases', function() {

    it('can be queried for information', function() {
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

      $httpBackend.expectGET(restUrl + "/" + dbname).respond(200, response);

      runs(function() {
        return cblite.database(dbname).info()
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it("can't be queried for information if they don't exist", function() {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname).respond(404, response);

      runs(function() {
        return cblite.database(dbname).info()
          .catch(function(error) {
            expect(error).toContainAll(response);
          });
      });
    });

    it('that exist can be tested for existence', function() {
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

      $httpBackend.expectGET(restUrl + "/" + dbname).respond(200, response);

      runs(function() {
        return cblite.database(dbname).exists()
          .then(function(exists) {
            expect(exists).toBe(true);
          });
      });
    });

    it("that don't exist can be tested for existence", function() {
      var response = {
        "status" : 404,
        "error" : "not_found"
      };

      $httpBackend.expectGET(restUrl + "/" + dbname).respond(404, response);

      runs(function() {
        return cblite.database(dbname).exists()
          .then(function(exists) {
            expect(exists).toBe(false);
          });
      });
    });

    it('can be created', function() {
      var response = {ok: true};
      $httpBackend.expectPUT(restUrl + "/" + dbname).respond(200, response);

      runs(function() {
        return cblite.database(dbname).create()
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });

    });

    it("can't be created again", function() {
      var response = {
        "status" : 412,
        "error" : "file_exists"
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname).respond(412, response);

      runs(function() {
        return cblite.database(dbname).create()
          .catch(function(error) {
            expect(error.data).toContainAll(response);
          });
      })
    })
  });

  describe('documents', function() {
    it('can be created with a known id', function() {
      var documentId = "document";
      var response = {
        "id" : documentId,
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      $httpBackend.expectPUT(restUrl + "/" + dbname + "/" + documentId).respond(201, response);

      runs(function() {
        return cblite.database(dbname).document(documentId).save()
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });
  });
});