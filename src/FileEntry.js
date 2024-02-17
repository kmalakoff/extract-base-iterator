const path = require('path');
const mkpath = require('mkpath');
const Queue = require('queue-cb');
const assign = require('just-extend');

const chmod = require('./fs/chmod');
const chown = require('./fs/chown');
const rimraf = require('rimraf');
const utimes = require('./fs/utimes');
const stripPath = require('./stripPath');
const validateAttributes = require('./validateAttributes');

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

function FileEntry(attributes) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  assign(this, attributes);
  if (this.basename === undefined) this.basename = path.basename(this.path);
  if (this.type === undefined) this.type = 'file';
  if (this._writeFile === undefined) throw new Error('File self missing _writeFile. Please implement this method in your subclass');
}

FileEntry.prototype.create = function create(dest, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  const self = this;
  if (typeof callback === 'function') {
    options = options || {};
    try {
      const normalizedPath = path.normalize(self.path);
      const fullPath = path.join(dest, stripPath(normalizedPath, options));

      const queue = new Queue(1);
      if (options.force) {
        queue.defer((callback) => {
          rimraf(fullPath, (err) => {
            err && err.code !== 'ENOENT' ? callback(err) : callback();
          });
        });
      }
      queue.defer(mkpath.bind(null, path.dirname(fullPath)));
      queue.defer(this._writeFile.bind(this, fullPath, options));
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

FileEntry.prototype.destroy = function destroy() {};

module.exports = FileEntry;
