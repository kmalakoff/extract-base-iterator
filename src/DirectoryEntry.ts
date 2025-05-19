import path from 'path';
import mkdirp from 'mkdirp-classic';
import objectAssign from 'object-assign';
import Queue from 'queue-cb';

import chmod from './fs/chmod.js';
import chown from './fs/chown.js';
import utimes from './fs/utimes.js';
import stripPath from './stripPath.js';
import validateAttributes from './validateAttributes.js';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];
import type { DirectoryAttributes } from './types.js';

export default class DirectoryEntry {
  path: string;
  basename: string;
  type: string;

  constructor(attributes: DirectoryAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.type === undefined) this.type = 'directory';
    if (this.basename === undefined) this.basename = path.basename(this.path);
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

        // do not check for the existence of the directory but allow out-of-order calling
        const queue = new Queue(1);
        queue.defer(mkdirp.bind(null, fullPath));
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
