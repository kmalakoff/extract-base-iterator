import path from 'path';
import mkdirp from 'mkdirp-classic';
import objectAssign from 'object-assign';
import Queue from 'queue-cb';

import rimraf2 from 'rimraf2';
import chmod from './fs/chmod.js';
import chown from './fs/chown.js';
import utimes from './fs/utimes.js';
import stripPath from './stripPath.js';
import validateAttributes from './validateAttributes.js';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];
import type { FileAttributes } from './types.js';

import type { WriteFileFn } from './types.js';
interface AbstractFileEntry {
  _writeFile: WriteFileFn;
}

export default class FileEntry {
  path: string;
  basename: string;
  type: string;

  constructor(attributes: FileAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.basename === undefined) this.basename = path.basename(this.path);
    if (this.type === undefined) this.type = 'file';
    if ((this as unknown as AbstractFileEntry)._writeFile === undefined) throw new Error('File this missing _writeFile. Please implement this method in your subclass');
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

        const queue = new Queue(1);
        if (options.force) {
          queue.defer((callback) => {
            rimraf2(fullPath, { disableGlob: true }, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        }
        queue.defer(mkdirp.bind(null, path.dirname(fullPath)));
        queue.defer((this as unknown as AbstractFileEntry)._writeFile.bind(this, fullPath, options));
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
