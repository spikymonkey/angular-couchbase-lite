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

  function expectedHeaders(headers) {
    // Always expect the Authorization header to be set
    return headers["Authorization"] === "Basic dXNlcm5hbWU6cGFzc3dvcmQ=";
  }

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

      $httpBackend.expectGET(restUrl, expectedHeaders)
        .respond(200, response);

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

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

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

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

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

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(200, response);

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

      $httpBackend.expectGET(restUrl + "/" + dbname, expectedHeaders)
        .respond(404, response);

      runs(function() {
        return cblite.database(dbname).exists()
          .then(function(exists) {
            expect(exists).toBe(false);
          });
      });
    });

    it('can be created', function() {
      var response = {ok: true};
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(200, response);

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
      $httpBackend.expectPUT(restUrl + "/" + dbname, null, expectedHeaders)
        .respond(412, response);

      runs(function() {
        return cblite.database(dbname).create()
          .catch(function(error) {
            expect(error.data).toContainAll(response);
          });
      })
    })
  });

  describe('documents', function() {
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

    it('can be saved with an id passed explicitly to save()', function() {
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

      runs(function() {
        return cblite.database(dbname).document(documentId).save(document)
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it('can be saved with an id extracted from the document', function() {
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

      runs(function() {
        return cblite.database(dbname).document().save(document)
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });

    it('can be saved without an id, allowing the server to generate one for us', function() {
      var document = {
        foo: "bar"
      };
      var response = {
        "id" : "209BB170-C1E0-473E-B3C4-A4533ACA3CDD",
        "rev" : "1-4101356e9c47d15d4f8f7390d05dbbcf",
        "ok" : true
      };
      $httpBackend.expectPOST(restUrl + "/" + dbname, document, expectedHeaders)
        .respond(201, response);

      runs(function() {
        return cblite.database(dbname).document().save(document)
          .then(function(result) {
            expect(result).toContainAll(response);
          });
      });
    });
  });
});