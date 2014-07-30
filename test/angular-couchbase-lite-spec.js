describe('Couchbase Lite', function() {

  var $httpBackend;
  var url = "my.couchbase.lite";
  var couchbaseLite;

  beforeEach(function() {
    this.addMatchers({
      toContainAll: function(expected) {
        var property;
        for (property in expected) {
          if (this.actual[property] !== expected[property]) return false;
        }
        return true;
      }
    });
  });

  beforeEach(module('couchbaseLite',
    function($provide) { $provide.constant('couchbaseLiteUrl', url) }));

  beforeEach(inject(function($injector, _couchbaseLite_) {
    $httpBackend = $injector.get('$httpBackend');
    couchbaseLite = _couchbaseLite_;
  }));

  afterEach(function() {
    //$httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('server', function() {
    it('can be queried for meta-information', function() {
      var response = {
        "couchdb" : "Welcome",
        "CouchbaseLite" : "Welcome",
        "version" : "1.485",
        "foo": "bar"
      };

      $httpBackend.expectGET(url).respond(200, response);

      runs(function() {
        return couchbaseLite.info()
          .then(function(info) {
            expect(info).toContainAll(response);
          });
      });
    })
  });

  describe('databases', function() {
    var dbname = "my-database";

    it('can be created', function() {
      $httpBackend.expectPUT(url + "/" + dbname).respond(200, {ok: true});

      runs(function() {
        return couchbaseLite.database(dbname).create()
          .then(function(db) {
            expect(db.ok).toBe(true);
          });
      });
    });
  });

});