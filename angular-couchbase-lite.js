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
    .factory('cblite', function cbliteFactory($resource, $log, $q, base64) {

      document.addEventListener('deviceready', deviceReady, false);

      var cordova = $q.defer(), cbliteUrl = $q.defer();
      var cbliteUrlPromise = cordova.promise.then(function() { return cbliteUrl.promise; });

      function deviceReady() {

        function ParsedUrl(url) {
          // Trim off the leading 'http://'
          var credentials = url.slice(7, url.indexOf('@')),
            basicAuthToken = base64.encode(credentials);

          return {
            credentials: credentials,
            basicAuthToken: basicAuthToken,
            url: url
          };
        }

        function getUrl() {
          // Grab the Couchbase Lite URL via the native bridge
          if (window.cblite) {
            window.cblite.getURL(function (err, url) {
              if (err) {
                cbliteUrl.reject(err);
              } else {
                cbliteUrl.notify("Couchbase Lite is running at " + url);
                cbliteUrl.resolve(new ParsedUrl(url));
              }
            });
          } else {
            throw ("Couchbase Lite plugin not found.");
          }
        }

        cordova.notify("Notified that Cordova is ready");
        cordova.resolve();
        getUrl();
      }


      function resource(path, paramDefaults) {
        return cbliteUrlPromise.then(
          function (parsedUrl) {
            var headers = {Authorization: 'Basic ' + parsedUrl.basicAuthToken};
            var actions = {
              'get':  {method: 'GET',  headers: headers},
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
          return resource('').then(function (server) {
            return server.get().$promise;
          });
        },

        // Databases
        database: function (databaseName) {
          var getDatabase = resource(':db', {db: databaseName});

          return {
            info: function() {
              $log.debug("Asking Couchbase Lite for info about database [" + databaseName + "]");
              return getDatabase.then(function (db) {
                return db.get({}, null).$promise;
              });
            },

            exists: function () {
              $log.debug("Asking Couchbase Lite if database [" + databaseName + "] exists");
              return getDatabase.then(function (db) {
                return db.get({}, null).$promise.then(
                  function (info) { return true; },
                  function (error) { return false; }
                );
              });
            },

            create: function () {
              $log.debug("Asking Couchbase Lite to create database [" + databaseName + "]");
              return getDatabase.then(function (db) {
                return db.put({}, null).$promise;
              });
            },

            // Documents
            document: function (id) {
              return {
                save: function (content) {
                  var type = typeof (content);
                  switch (type) {
                    case "undefined":
                    case "number":
                    case "boolean":
                    case "function":
                    case "symbol":
                      throw "You can't save this type: " + type;
                      break;

                    case "object":
                      if (content === null) {
                        throw "You can't save a null document"
                      }
                      break;
                  }

                  if (!angular.isDefined(id)) {
                    // If no id has been provided, then see if we can pull one from the document
                    id = content._id;
                    if (id === null || !angular.isDefined(id)) {
                      $log.debug("Asking Couchbase Lite to save document with a database-generated id in database [" + databaseName + "]");
                      return resource(':db', {db: databaseName}).then(function (database) {
                        return database.post(content).$promise;
                      });
                    }
                  }

                  $log.debug("Asking Couchbase Lite to save document with id [" + id + "] in database [" + databaseName + "]");
                  return resource(':db/:doc', {db: databaseName, doc: id}).then(function (document) {
                    return document.put(content).$promise;
                  });
                }
              };
            }
          };
        }
      };
    });
}());