/*
 The MIT License

 Copyright (c) 2013-2014 Gareth Clay

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

(function() {
  angular.module('cblite', ['ngResource'])
    .factory('cblite', function cbliteFactory($resource, $log, $q) {

      var serverUrl;
      var initialised = $q.defer();

      function resource(url, paramDefaults, actions, options) {
        var resource = $resource(serverUrl + url, paramDefaults, actions, options);

        if (serverUrl) {
          return resource;
        } else {
          initialised.promise.then(function () {
            return resource;
          });
        }
      };

      return {
        deviceReady: function() {
          if (serverUrl) throw("Angular Couchbase Lite has already been initialised!");

          // Grab the Couchbase Lite URL via the native bridge
          $log.debug("deviceReady() called, getting Couchbase Lite URL");

          if (window.cblite) {
            window.cblite.getURL(function (err, url) {
              if (err) {
                $log.error("Unable to connect to Couchbase Lite: " + err);
                initialised.reject(err);
              } else {
                $log.info("Couchbase Lite running at " + url);
                serverUrl = url;
                initialised.resolve(url);
              }
            });
          } else {
            $log.error("Couchbase Lite plugin not found.");
          }
        },

        // Couchbase Lite Server
        server: function () {
          var server = resource('');

          return {
            info: function () {
              return server.get().$promise;
            }
          }
        },

        // Databases
        database: function (databaseName) {
          var database = resource('/:db',
            {db: databaseName},
            {'create': {method: 'PUT'}});

          return {
            create: function () {
              return database.create().$promise;
            },

            // Documents
            document: function (id) {
              var document = resource('/:db/:doc',
                {db: databaseName, doc: id},
                {'create': {method: 'PUT'}});

              return {
                save: function (content) {
                  return document.create(content).$promise;
                }
              }
            }
          }
        }
      }
    })
}).call();