/*globals angular */
(function() {
  'use strict';

  angular.module('cbliteMock', [])
    .factory('cblite', function cbliteMockFactory() {
      var databases = {};

      function DatabaseMock(databaseName) {
        var documents = {};

        function DocumentMock(documentName) {
          var content = {};
          var that = this;
          var document = {
            setContent: function (content) {
              that.content = content;
            },

            save: function (data) {
              return {
                then: function (success, failure) {
                  return success({});
                }
              };
            },

            load: function () {
              return {
                then: function (fn) {
                  return fn(that.content);
                }
              };
            }
          };
          documents[documentName] = document;
          return document;
        }

        var database = {
          checkIfExists: function () {
            return {
              then: function (fn) {
                return fn(true);
              }
            };
          },

          createIfMissing: function () {
            return {
              then: function (fn) {
                fn();
              }
            };
          },

          document: function (documentName) {
            if (angular.isUndefined(documentName)) {
              documentName = 'doc-or-db-generated-name';
            }

            return documents[documentName] ? documents[documentName] : new DocumentMock(documentName);
          },

          syncWith: function (params) {
            return {
              then: function (fn) {
                return fn();
              }
            };
          }
        };

        databases[databaseName] = database;
        return database;
      }

      return {
        database: function (databaseName) {
          return (databases[databaseName]) ? databases[databaseName] : new DatabaseMock(databaseName);
        },

        activeTasks: function () {
          return {
            then: function (fn) {
              return fn();
            }
          };
        }
      };
    });
})();



