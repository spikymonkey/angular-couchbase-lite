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

      function deviceReady() {
        console.log('deviceReady() called');
        cordova.resolve();
        getUrl();
      }
      
//      document.addEventListener('deviceready', deviceReady, false);
      deviceReady();
      
      function getUrl() {
        // Grab the Couchbase Lite URL via the native bridge
        if (window.cblite) {
          window.cblite.getURL(function (err, url) {
            if (err) {
              cbliteUrl.reject(err);
            } else {
              $log.info("Couchbase Lite running at " + url);
              cbliteUrl.resolve(url);
            }
          });
        } else {
          throw ("Couchbase Lite plugin not found.");
        }
      }
      
      function resource(path, paramDefaults, actions, options) {    
        return cordova.promise.then(function () {
          console.log('cordova promise complete')
          return cbliteUrl.promise.then(function (url) {
            console.log('url promise complete')
            return $resource(url + path, paramDefaults, actions, options);
          })
        });
      }

      return {
        // Couchbase Lite Server
        info: function () {
          return resource('').then(function (server) {
            console.log(JSON.stringify(server));
            server.get().$promise;
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
                db.create().$promise;
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
                    document.create(content).$promise;
                  });
                }
              };
            }
          };
        }
      };
    });
}());