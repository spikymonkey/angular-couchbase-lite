describe('Couchbase Lite', function() {

  var $httpBackend;
  var url = "my.couchbase.lite";

  beforeEach(module('couchbaseLite', function($provide) { $provide.constant('couchbaseLiteUrl', url) }));

  beforeEach(inject(function($injector) {
    $httpBackend = $injector.get('$httpBackend');
  }));

  afterEach(function() {
    $httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  describe('databases', function() {
    var dbname = "my-database";

    it('can be created', inject(function(couchbaseLite, $resource) {
      $httpBackend.expectPUT(url + "/" + dbname).respond({ok: true});

      couchbaseLite.database(dbname).create();
    }));
  });

});