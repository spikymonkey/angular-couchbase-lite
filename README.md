# README #
An AngularJS wrapper for the [Couchbase Lite](http://developer.couchbase.com/mobile/)
[Cordova plugin](http://plugins.cordova.io/#/package/com.couchbase.lite.phonegap).

## Note ##
This is intended for use with Couchbase-Lite-PhoneGap-Plugin (com.couchbase.lite.phonegap) 1.1.x. If you are using an older version you probably want to use the version of this repo tagged v1.0.4

## Warning ##
This is very much a work in progress. Obvious features are missing. The features that are there might fail in surprising
ways. Take a peek by all means but please don't try using it in production ;) PRs are very welcome.

## Install ##
Install this module with `bower` or `npm`. 

In your `index.html` include the necessary `<script>` tags.

      <script src="lib/angular-couchbase-lite/angular-couchbase-lite.js"></script>
      <script src="lib/angular-resource/angular-resource.min.js"></script>
      <script src="lib/angular-utf8-base64/angular-utf8-base64.min.js"></script>

## Usage ##
Refer to the [Couchbase Lite API References](http://developer.couchbase.com/mobile/develop/references/couchbase-lite/rest-api/document/index.html) for more details.

### Create a database ###
    cblite.database("testdb").createIfMissing().then(function(db) {});

### Compact database ###
To reclaim disk space.

    cblite.database("testdb").compact();

### Put document ###
Will automatically generate a revision ID. Will return a conflict 409 error if document revision already exists.

    cblite.database("testdb").document("testdoc").save({key:"value"});

### Get all documents in database ###
    cblite.database("testdb").all({include_docs:true}).then(function(documents) {});

### Get document ###
    cblite.database("testdb").document("testdoc").load().then(function(document) {});

### Update document ###
When updating, you need to specify the document revision you wish to save.

    cblite.database("testdb").document("testdoc").load(function(document) {
      cblite.database("testdb").document("testdoc").save({key:"newvalue"}, document._rev);
    });

### Delete document ###
Mark document as deleted.

    cblite.database("testdb").document("testdoc").delete();

### Purge document ###
Permanently remove from database. Can optionally specify array of revisions to delete.

    cblite.database("testdb").document("testdoc").purge();

## Testing ##
Unit tests are implemented using [Jasmine 1.3](http://jasmine.github.io/1.3/introduction.html) and can be run using
[Karma](http://karma-runner.github.io/).

Integration testing is tougher as it needs to be done on a real device running a real Couchbase Lite. I haven't got around
to automating this yet.
