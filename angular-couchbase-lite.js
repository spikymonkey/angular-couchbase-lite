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
  angular.module('cblite', ['ngResource'])
    .factory('cblite', function cbliteFactory($resource, $log, $q) {

      var cordova = $q.defer(), cbliteUrl = $q.defer();

      var deviceReady = function () {
        cordova.notify("Notified that Cordova is ready");
        cordova.resolve();
        getUrl();
      };

      document.addEventListener('deviceready', deviceReady, false);

      function getUrl() {
        // Grab the Couchbase Lite URL via the native bridge
        if (window.cblite) {
          window.cblite.getURL(function (err, url) {
            if (err) {
              cbliteUrl.reject(err);
            } else {
              // Trim the trailing slash if there is one
              if (url.indexOf('/', this.length - 1) !== -1) {
                url = url.substring(0, url.length - 1);
              }
              cbliteUrl.notify("Couchbase Lite is running at " + url);
              cbliteUrl.resolve(url);
            }
          });
        } else {
          throw ("Couchbase Lite plugin not found.");
        }
      }
      
      function resource(path, paramDefaults, actions, options) {
        return cordova.promise.then(
          function () {
            return cbliteUrl.promise.then(function (url) {
              return $resource(url + path, paramDefaults, actions, options);
            })
          },
          null,
          function(notification) {
            var message = "Angular Couchbase Lite: " + notification;
            console.log(message); // For testing
            $log.debug(message);
          });
      }

      return {
        // Couchbase Lite Server
        info: function () {
          return resource('').then(function (server) {
            return server.get().$promise;
          });
        },

        // Databases
        database: function (databaseName) {
          var getDatabase = resource('/:db',
            {db: databaseName},
            {'create': {method: 'PUT'}});

          return {
            create: function () {
              return getDatabase.then(function (db) {
                return db.create().$promise;
              });
            },

            // Documents
            document: function (id) {
              var getDocument = resource('/:db/:doc',
                {db: databaseName, doc: id},
                {'create': {method: 'PUT'}});

              return {
                save: function (content) {
                  return getDocument.then(function (document) {
                    return document.create(content).$promise;
                  });
                }
              };
            }
          };
        }
      };
    });
}());