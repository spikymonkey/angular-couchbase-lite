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
  'use strict';
  angular.module('cblite', ['ngResource', 'ab-base64'])
    .factory('cblite', function cbliteFactory($resource, $log, $q, base64, $filter) {

      var deferredCordova = $q.defer(),
        deferredCBLiteUrl = $q.defer(),
        cbliteUrlPromise = deferredCordova.promise.then(function () { return deferredCBLiteUrl.promise; }),
        cblite;

      function deviceReady() {
        function ParsedUrl(url) {
          // Trim off the leading 'http://'
          var http = "http://",
            credentials = url.slice(http.length, url.indexOf('@')),
            basicAuthToken = base64.encode(credentials);

          $log.debug("Couchbase Lite auth token: " + basicAuthToken);

          return {
            credentials: credentials,
            basicAuthToken: basicAuthToken,
            url: url,
            urlNoCredentials: http + url.slice(http.length + credentials.length + 1) // '@' symbol
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
            var headers = {Authorization: 'Basic ' + parsedUrl.basicAuthToken},
              actions = {
                'get':  {method: 'GET',  headers: headers},
                'list': {method: 'GET',  headers: headers, isArray: true},
                'put':  {method: 'PUT',  headers: headers},
                'post': {method: 'POST', headers: headers}
              };

            return $resource(parsedUrl.url + path, paramDefaults, actions);
          },
          null,
          function (notification) {
            var message = "Angular Couchbase Lite: " + notification;
            $log.debug(message);
          }
        );
      }

      document.addEventListener('deviceready', deviceReady, false);

      return {
        // Couchbase Lite Server
        info: function () {
          $log.debug("Asking Couchbase Lite for server info");
          return openResource('').then(function (server) {
            return server.get().$promise;
          });
        },

        activeTasks: function () {
//          $log.debug("Asking Couchbase Lite for a list of active tasks");
          return openResource('_active_tasks').then(function (server) {
            return server.list().$promise;
          });
        },

        allDatabases: function () {
          var that = this;
//          $log.debug("Asking Couchbase Lite for list of all databases");
          return openResource('_all_dbs').then(function (allDatabases) {
            return allDatabases.list().$promise.then(function (databaseNames) {
              return databaseNames.map(function (name) {
                return that.database(name);
              });
            });
          });
        },

        userDatabases: function () {
          $log.debug("Asking Couchbase Lite for list of user databases");
          return this.allDatabases().then(function (databases) {
            return $filter('filter')(databases, function (db) { return db.slice(0, 1) !== '_'; });
          });
        },

        // Databases
        database: function (databaseName) {
          var openDatabase = openResource(':db', {db: databaseName}),
            openReplication = openResource('_replicate');

          function validateDocument(content) {
            var type = typeof content;
            switch (type) {
            case "string":
              if (typeof JSON.parse(content) !== "object") {
                throw "You can only save valid JSON strings";
              }
              break;

            case "object":
              if (content === null) {
                throw "You can't save a null document";
              }
              break;

            default:
              throw "You can't save this type: " + type;
            }
          }

          function toReplicationSpec(spec) {
            if (typeof spec === 'string') {
              spec = {
                url: spec,
                continuous: false
              };
            }
            return spec;
          }

          return {
            name: function () { return databaseName; },

            info: function () {
//              $log.debug("Asking Couchbase Lite for info about database [" + databaseName + "]");
              return openDatabase.then(function (db) {
                return db.get().$promise;
              });
            },

            checkIfExists: function () {
              $log.debug("Asking Couchbase Lite if database [" + databaseName + "] exists");
              return this.info().then(
                function () {
                  $log.debug("Couchbase Lite database '" + databaseName + "' exists");
                  return true;
                },
                function () {
                  $log.debug("Couchbase Lite database '" + databaseName + "' does not exist");
                  return false;
                }
              );
            },

            create: function () {
              $log.debug("Asking Couchbase Lite to create database [" + databaseName + "]");
              return openDatabase.then(function (db) {
                return db.put({}, null).$promise;
              });
            },

            createIfMissing: function () {
              var that = this;
              return this.info().then(
                function (info) { return info; },
                function (error) {
                  if (error.status === 404) {
                    return that.create();
                  }
                  throw "Unable to create database: " + JSON.stringify(error.data);
                }
              );
            },

            changes: function (spec) {
              $log.debug("Asking Couchbase Lite for list of changes to database [" + databaseName + "]");
              spec = angular.extend({}, spec, {db: databaseName});
              return openResource(':db/_changes', spec).then(function (db) {
                return db.get().$promise;
              });
            },

            // Documents
            document: function (id) {
              var resourceString = ':db/:doc';

              return {
                load: function (spec) {
                  spec = angular.extend({}, spec, {db: databaseName, doc: id});
                  $log.debug("Asking Couchbase Lite for document with id [" + id + "] in database [" + databaseName + "]");
                  return openResource(resourceString, spec).then(function (document) {
                    return document.get().$promise;
                  }, function (error) {
                    $log.error("Failed to load document '" + id + "': " + JSON.stringify(error));
                    throw error;
                  });
                },

                save: function (content, revision) {
                  validateDocument(content);

                  if (revision != null && angular.isDefined(revision)) {
                    content._rev = revision
                  }

                  if (/*!isLocalDocument && */!angular.isDefined(id)) {
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
                        });
                      });
                    }
                  }

                  $log.debug("Asking Couchbase Lite to save document with id [" + id + "] in database [" + databaseName + "]");
                  $log.debug(JSON.stringify(content));
                  return openResource(resourceString, {db: databaseName, doc: id}).then(function (document) {
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
                  target: spec.url,
                  continuous: spec.continuous,
                  headers: spec.headers
                };
                $log.debug('Couchbase Lite requesting replication: ' + JSON.stringify(request));
                return replication.post(request).$promise;
              });
            },

            replicateFrom: function (spec) {
              spec = toReplicationSpec(spec);
              return openReplication.then(function (replication) {
                var request = {
                  source: spec.url,
                  target: databaseName,
                  continuous: spec.continuous,
                  headers: spec.headers
                };
                $log.debug('Couchbase Lite requesting replication: ' + JSON.stringify(request));
                return replication.post(request).$promise;
              });
            },

            syncWith: function (spec) {
              var that = this,
                sync = $q.defer(),
                combinedResponse = {};

              that.replicateTo(spec).then(
                function (localToRemoteResponse) {
                  combinedResponse.localToRemote = localToRemoteResponse;

                  return that.replicateFrom(spec).then(
                    function (remoteToLocalResponse) {
                      $log.error('Couchbase Lite replication request failed: ' + JSON.stringify(remoteToLocalResponse));
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
                  $log.error('Couchbase Lite replication request failed: ' + JSON.stringify(localToRemoteError));
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
