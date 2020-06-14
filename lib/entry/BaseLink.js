var path = require('path');
var assign = require('object-assign');
var fs = require('graceful-fs');
var mkpath = require('mkpath');
var rimraf = require('rimraf');
var Queue = require('queue-cb');

var chmod = require('../fs/chmod');
var chown = require('../fs/chown');
var utimes = require('../fs/utimes');
var stripPath = require('../stripPath');
var validateAttributes = require('../validateAttributes');

var MANDATORY_ATTRIBUTES = ['mode', 'uid', 'gid', 'mtime', 'path', 'targetPath'];

function LinkBaseEntry(attributes, type) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  assign(this, attributes);
  if (this.basename === undefined) this.basename = path.basename(this.path);
  this.type = type;
}

LinkBaseEntry.prototype.create = function create(dest, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  var self = this;
  if (typeof callback === 'function') {
    options = options || {};
    try {
      var fullPath = path.join(dest, stripPath(self.path, options));
      var targetFullPath = path.join(dest, stripPath(self.targetPath, options));
      var link = fs[self.type];

      var queue = new Queue(1);
      queue.defer(function (callback) {
        rimraf(fullPath, function (err) {
          err && err.code !== 'ENOENT' ? callback(err) : callback();
        });
      });
      queue.defer(function (callback) {
        mkpath(path.dirname(fullPath), function (err) {
          err && err.code !== 'EEXIST' ? callback(err) : callback();
        });
      });
      queue.defer(link.bind(fs, targetFullPath, fullPath));
      queue.defer(chmod.bind(null, fullPath, self, options));
      queue.defer(chown.bind(null, fullPath, self, options));
      queue.defer(utimes.bind(null, fullPath, self, options));
      return queue.await(callback);
    } catch (err) {
      return callback(err);
    }
  }

  return new Promise(function createPromise(resolve, reject) {
    self.create(dest, options, function createCallback(err, done) {
      err ? reject(err) : resolve(done);
    });
  });
};

module.exports = LinkBaseEntry;
