import path from 'path';
import mkpath from 'mkpath';
import Queue from 'queue-cb';

import chmod from './fs/chmod.mjs';
import chown from './fs/chown.mjs';
import utimes from './fs/utimes.mjs';
import stripPath from './stripPath.mjs';
import validateAttributes from './validateAttributes.mjs';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

export default function DirectoryEntry(attributes) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  Object.assign(this, attributes);
  if (this.type === undefined) this.type = 'directory';
  if (this.basename === undefined) this.basename = path.basename(this.path);
}

DirectoryEntry.prototype.create = function create(dest, options, callback) {
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

      // do not check for the existence of the directory but allow out-of-order calling
      const queue = new Queue(1);
      queue.defer(mkpath.bind(null, fullPath));
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

DirectoryEntry.prototype.destroy = function destroy() {};
