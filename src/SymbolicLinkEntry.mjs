import path from 'path';
import fs from 'graceful-fs';
import isAbsolute from 'is-absolute';
import assign from 'just-extend';
import mkpath from 'mkpath';
import Queue from 'queue-cb';
import rimraf from 'rimraf';

import chmod from './fs/chmod.mjs';
import chown from './fs/chown.mjs';
import lstatReal from './fs/lstatReal.mjs';
import utimes from './fs/utimes.mjs';
import stripPath from './stripPath.mjs';
import validateAttributes from './validateAttributes.mjs';

function symlinkWin32(linkFullPath, linkpath, fullPath, callback) {
  lstatReal(linkFullPath, (err, targetStat) => {
    if (err || !targetStat) return callback(err || new Error(`Symlink path does not exist${linkFullPath}`));
    const type = targetStat.isDirectory() ? 'dir' : 'file';
    fs.symlink(linkpath, fullPath, type, callback);
  });
}
const isWindows = process.platform === 'win32';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

export default function SymbolicLinkEntry(attributes) {
  validateAttributes(attributes, MANDATORY_ATTRIBUTES);
  assign(this, attributes);
  if (this.basename === undefined) this.basename = path.basename(this.path);
  if (this.type === undefined) this.type = 'symlink';
}

SymbolicLinkEntry.prototype.create = function create(dest, options, callback) {
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
      let normalizedLinkpath = path.normalize(self.linkpath);
      let linkFullPath = path.join(dest, stripPath(normalizedLinkpath, options));
      if (!isAbsolute(normalizedLinkpath)) {
        const linkRelativePath = path.join(path.dirname(normalizedPath), self.linkpath);
        linkFullPath = path.join(dest, stripPath(linkRelativePath, options));
        normalizedLinkpath = path.relative(path.dirname(fullPath), linkFullPath);
      }

      const queue = new Queue(1);
      if (options.force) {
        queue.defer((callback) => {
          rimraf(fullPath, (err) => {
            err && err.code !== 'ENOENT' ? callback(err) : callback();
          });
        });
      }
      queue.defer(mkpath.bind(null, path.dirname(fullPath)));
      if (isWindows) queue.defer(symlinkWin32.bind(null, linkFullPath, normalizedLinkpath, fullPath));
      else queue.defer(fs.symlink.bind(fs, normalizedLinkpath, fullPath));
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

SymbolicLinkEntry.prototype.destroy = function destroy() {};
