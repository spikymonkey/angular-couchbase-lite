# README #
An AngularJS wrapper for the [Couchbase Lite](http://developer.couchbase.com/mobile/)
[Cordova plugin](http://plugins.cordova.io/#/package/com.couchbase.lite.phonegap).

## Warning ##
This is very much a work in progress. Obvious features are missing. The features that are there might fail in surprising
ways. Take a peek by all means but please don't try using it in production ;) PRs are very welcome.

## Testing ##
Unit tests are implemented using [Jasmine 1.3](http://jasmine.github.io/1.3/introduction.html) and can be run using
[Karma](http://karma-runner.github.io/).

Integration testing is tougher as it needs to be done on a real device running a real Couchbase Lite. I haven't got around
to automating this yet.