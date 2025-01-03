import path from 'path';
import mkdirp from 'mkdirp-classic';
import objectAssign from 'object-assign';
import Queue from 'queue-cb';

import rimraf2 from 'rimraf2';
import chmod from './fs/chmod.mjs';
import chown from './fs/chown.mjs';
import utimes from './fs/utimes.mjs';
import stripPath from './stripPath.mjs';
import validateAttributes from './validateAttributes.mjs';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

export default function FileEntry(attributes) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  objectAssign(this, attributes);
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
          rimraf2(fullPath, { disableGlob: true }, (err) => {
            err && err.code !== 'ENOENT' ? callback(err) : callback();
          });
        });
      }
      queue.defer(mkdirp.bind(null, path.dirname(fullPath)));
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
    self.create(dest, options, (err, done) => (err ? reject(err) : resolve(done)));
  });
};

FileEntry.prototype.destroy = function destroy() {};
