import path from 'path';
import fs from 'graceful-fs';
import assign from 'just-extend';
import mkpath from 'mkpath';
import Queue from 'queue-cb';
import rimraf from 'rimraf';

import chmod from './fs/chmod.mjs';
import chown from './fs/chown.mjs';
import utimes from './fs/utimes.mjs';
import stripPath from './stripPath.mjs';
import validateAttributes from './validateAttributes.mjs';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

export default function LinkEntry(attributes, _type) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  assign(this, attributes);
  if (this.basename === undefined) this.basename = path.basename(this.path);
  if (this.type === undefined) this.type = 'link';
}

LinkEntry.prototype.create = function create(dest, options, callback) {
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
      const normalizedLinkpath = path.normalize(self.linkpath);
      const linkFullPath = path.join(dest, stripPath(normalizedLinkpath, options));

      const queue = new Queue(1);
      if (options.force) {
        queue.defer((callback) => {
          rimraf(fullPath, (err) => {
            err && err.code !== 'ENOENT' ? callback(err) : callback();
          });
        });
      }
      queue.defer(mkpath.bind(null, path.dirname(fullPath)));
      queue.defer(fs.link.bind(fs, linkFullPath, fullPath));
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

LinkEntry.prototype.destroy = function destroy() {};
