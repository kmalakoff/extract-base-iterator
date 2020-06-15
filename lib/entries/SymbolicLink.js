var path = require('path');
var assign = require('object-assign');
var fs = require('graceful-fs');
var mkpath = require('mkpath');
var rimraf = require('rimraf');
var Queue = require('queue-cb');

var chmod = require('../fs/chmod');
var chown = require('../fs/chown');
var utimes = require('../fs/utimes');
var lstatReal = require('../lstatReal');
var stripPath = require('../stripPath');
var validateAttributes = require('../validateAttributes');

function symlinkWin32(targetFullPath, fullPath, callback) {
  lstatReal(targetFullPath, function (err, targetStat) {
    if (err || !targetStat) return callback(err || new Error('Symlink path does not exist' + targetFullPath));
    var type = targetStat.isDirectory() ? 'dir' : 'file';

    fs.symlink(targetFullPath, fullPath, type, callback);
  });
}
var symlink = process.platform === 'win32' ? symlinkWin32 : fs.symlink;

var MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

function SymbolicLinkEntry(attributes, type) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  assign(this, attributes);
  if (this.basename === undefined) this.basename = path.basename(this.path);
  if (this.type === undefined) this.type = 'link';
}

SymbolicLinkEntry.prototype.create = function create(dest, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  var self = this;
  if (typeof callback === 'function') {
    options = options || {};
    try {
      var fullPath = path.join(dest, stripPath(self.path, options));

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
      queue.defer(symlink.bind(fs, self.linkpath, fullPath));
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

module.exports = SymbolicLinkEntry;
