/*
 The MIT License

 Copyright (c) 2014 Gareth Clay

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */

(function () {
  angular.module('cblite', ['ngResource', 'ab-base64'])
    .factory('cblite', function cbliteFactory($resource, $log, $q, base64, $filter) {

      document.addEventListener('deviceready', deviceReady, false);

      var deferredCordova = $q.defer(), deferredCBLiteUrl = $q.defer();
      var cbliteUrlPromise = deferredCordova.promise.then(function() { return deferredCBLiteUrl.promise; });
      var cblite;

      function deviceReady() {
        function ParsedUrl(url) {
          // Trim off the leading 'http://'
          var http = "http://";
          var credentials = url.slice(http.length, url.indexOf('@')),
            basicAuthToken = base64.encode(credentials);

          return {
            credentials: credentials,
            basicAuthToken: basicAuthToken,
            url: url,
            urlNoCredentials: http + url.slice(http.length +credentials.length + 1) // '@' symbol
          };
        }

        function getUrl() {
          // Grab the Couchbase Lite URL via the native bridge
          if (window.cblite) {
            window.cblite.getURL(function (err, url) {
              if (err) {
                deferredCBLiteUrl.reject(err);
              } else {
                deferredCBLiteUrl.notify("Couchbase Lite is running at " + url);
                cblite = new ParsedUrl(url);
                deferredCBLiteUrl.resolve(cblite);
              }
            });
          } else {
            throw ("Couchbase Lite plugin not found.");
          }
        }

        deferredCordova.notify("Notified that Cordova is ready");
        deferredCordova.resolve();
        getUrl();
      }

      function openResource(path, paramDefaults) {
        return cbliteUrlPromise.then(
          function (parsedUrl) {
            var headers = {Authorization: 'Basic ' + parsedUrl.basicAuthToken};
            var actions = {
              'get':  {method: 'GET',  headers: headers},
              'list': {method: 'GET', headers: headers, isArray: true},
              'put':  {method: 'PUT',  headers: headers},
              'post': {method: 'POST', headers: headers}
            };

            return $resource(parsedUrl.url + path, paramDefaults, actions);
          },
          null,
          function(notification) {
            var message = "Angular Couchbase Lite: " + notification;
            $log.debug(message);
          });
      }

      return {
        // Couchbase Lite Server
        info: function () {
          $log.debug("Asking for Couchbase Lite server info");
          return openResource('').then(function (server) {
            return server.get().$promise;
          });
        },

        activeTasks: function () {
          $log.debug("Asking for Couchbase Lite server active tasks");
          return openResource('_active_tasks').then(function (server) {
            return server.list().$promise;
          });
        },

        allDatabases: function () {
          $log.debug("Asking Couchbase Lite for list of all databases");
          return openResource('_all_dbs').then(function (databases) {
            return databases.list().$promise;
          })
        },

        userDatabases: function () {
          $log.debug("Asking Couchbase Lite for list of user databases");
          return this.allDatabases().then(function (databases) {
            return $filter('filter')(databases, function (db) { return db.slice(0, 1) !== '_'; });
          });
        },

        // Databases
        database: function (databaseName) {
          var openDatabase = openResource(':db', {db: databaseName});
          var openReplication = openResource('_replicate');

          function validateDocument(content) {
            var type = typeof (content);
            switch (type) {
              case "string":
                if (typeof JSON.parse(content) !== "object") {
                  throw "You can only save valid JSON strings"
                }
                break;

              case "object":
                if (content === null) {
                  throw "You can't save a null document"
                }
                break;

              default:
                throw "You can't save this type: " + type;
                break;
            }
          }

          function toReplicationSpec(spec) {
            function trimTrailingSlash(url) {
              return (url.slice(-1) === '/' ? url : url + '/')
            }

            if (typeof spec === 'string') {
              spec = {
                url: trimTrailingSlash(spec),
                continuous: false
              }
            } else {
              spec.url = trimTrailingSlash(spec.url)
            }
            return spec;
          }

          return {
            info: function() {
              $log.debug("Asking Couchbase Lite for info about database [" + databaseName + "]");
              return openDatabase.then(function (db) {
                return db.get({}, null).$promise;
              });
            },

            exists: function () {
              $log.debug("Asking Couchbase Lite if database [" + databaseName + "] exists");
              return openDatabase.then(function (db) {
                return db.get({}, null).$promise.then(
                  function () { return true; },
                  function () { return false; }
                );
              });
            },

            create: function () {
              $log.debug("Asking Couchbase Lite to create database [" + databaseName + "]");
              return openDatabase.then(function (db) {
                return db.put({}, null).$promise;
              });
            },

            changes: function (spec) {
              $log.debug("Asking Couchbase Lite for list of changes to database [" + databaseName + "]");
              spec = angular.extend({}, spec, {db: databaseName});
              return openResource(':db/_changes', spec).then(function (db) {
                return db.get().$promise;
              })
            },

            // Documents
            document: function (id) {
              return {
                fetch: function (spec) {
                  spec = angular.extend({}, spec, {db: databaseName, doc: id});
                  $log.debug("Asking Couchbase Lite for document with id [" + id + "] in database [" + databaseName + "]");
                  return openResource(':db/:doc', spec).then(function (document) {
                    return document.get().$promise;
                  });
                },

                save: function (content) {
                  validateDocument(content);

                  if (!angular.isDefined(id)) {
                    // If no id has been provided, then see if we can pull one from the document
                    id = content._id;
                    if (id === null || !angular.isDefined(id)) {
                      $log.debug("Asking Couchbase Lite to save document with a database-generated id in database [" + databaseName + "]");
                      return openResource(':db', {db: databaseName}).then(function (database) {
                        var promise = database.post(content).$promise;
                        return promise.then(function (response) {
                          // Update our cached id with the one returned in the response
                          id = response.id;
                          return promise;
                        })
                      });
                    }
                  }

                  $log.debug("Asking Couchbase Lite to save document with id [" + id + "] in database [" + databaseName + "]");
                  return openResource(':db/:doc', {db: databaseName, doc: id}).then(function (document) {
                    return document.put(content).$promise;
                  });
                }
              };
            },

            // Replication and sync
            replicateTo: function (spec) {
              spec = toReplicationSpec(spec);
              return openReplication.then(function (replication) {
                var request = {
                  source: databaseName,
                  target: spec.url + databaseName,
                  continuous: spec.continuous
                };
                return replication.post(request).$promise;
              })
            },

            replicateFrom: function (spec) {
              spec = toReplicationSpec(spec);
              return openReplication.then(function (replication) {
                var request = {
                  source: spec.url + databaseName,
                  target: databaseName,
                  continuous: spec.continuous
                };
                return replication.post(request).$promise;
              })
            },

            syncWith: function (spec) {
              var that = this;
              var sync = $q.defer();
              var combinedResponse = {};

              that.replicateTo(spec).then(
                function (localToRemoteResponse) {
                  combinedResponse.localToRemote = localToRemoteResponse;

                  return that.replicateFrom(spec).then(
                    function (remoteToLocalResponse) {
                      combinedResponse.remoteToLocal = remoteToLocalResponse;
                      sync.resolve(combinedResponse);
                    },
                    function (remoteToLocalError) {
                      combinedResponse.remoteToLocal = remoteToLocalError;
                      sync.reject(combinedResponse);
                    }
                  );
                },
                function (localToRemoteError) {
                  combinedResponse.localToRemote = localToRemoteError;
                  sync.reject(combinedResponse);
                }
              );

              return sync.promise;
            }
          };
        }
      };
    });
}());