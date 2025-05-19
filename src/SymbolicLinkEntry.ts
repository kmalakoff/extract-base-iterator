import path from 'path';
import fs from 'graceful-fs';
import isAbsolute from 'is-absolute';
import mkdirp from 'mkdirp-classic';
import objectAssign from 'object-assign';
import Queue from 'queue-cb';
import rimraf2 from 'rimraf2';

import chmod from './fs/chmod.js';
import chown from './fs/chown.js';
import lstatReal from './fs/lstatReal.js';
import utimes from './fs/utimes.js';
import stripPath from './stripPath.js';
import validateAttributes from './validateAttributes.js';

function symlinkWin32(linkFullPath, linkpath, fullPath, callback) {
  lstatReal(linkFullPath, (err, targetStat) => {
    if (err || !targetStat) return callback(err || new Error(`Symlink path does not exist${linkFullPath}`));
    const type = targetStat.isDirectory() ? 'dir' : 'file';
    fs.symlink(linkpath, fullPath, type, callback);
  });
}
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];
import type { LinkAttributes } from './types.js';

export default class SymbolicLinkEntry {
  path: string;
  basename: string;
  type: string;
  linkpath: string;

  constructor(attributes: LinkAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.basename === undefined) this.basename = path.basename(this.path);
    if (this.type === undefined) this.type = 'symlink';
  }

  create(dest, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    if (typeof callback === 'function') {
      options = options || {};
      try {
        const normalizedPath = path.normalize(this.path);
        const fullPath = path.join(dest, stripPath(normalizedPath, options));
        let normalizedLinkpath = path.normalize(this.linkpath);
        let linkFullPath = path.join(dest, stripPath(normalizedLinkpath, options));
        if (!isAbsolute(normalizedLinkpath)) {
          const linkRelativePath = path.join(path.dirname(normalizedPath), this.linkpath);
          linkFullPath = path.join(dest, stripPath(linkRelativePath, options));
          normalizedLinkpath = path.relative(path.dirname(fullPath), linkFullPath);
        }

        const queue = new Queue(1);
        if (options.force) {
          queue.defer((callback) => {
            rimraf2(fullPath, { disableGlob: true }, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        }
        queue.defer(mkdirp.bind(null, path.dirname(fullPath)));
        if (isWindows) queue.defer(symlinkWin32.bind(null, linkFullPath, normalizedLinkpath, fullPath));
        else queue.defer(fs.symlink.bind(fs, normalizedLinkpath, fullPath));
        queue.defer(chmod.bind(null, fullPath, this, options));
        queue.defer(chown.bind(null, fullPath, this, options));
        queue.defer(utimes.bind(null, fullPath, this, options));
        return queue.await(callback);
      } catch (err) {
        return callback(err);
      }
    }

    return new Promise((resolve, reject) => {
      this.create(dest, options, (err, done) => (err ? reject(err) : resolve(done)));
    });
  }

  destroy() {}
}
