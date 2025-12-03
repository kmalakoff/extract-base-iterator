import mkdirp from 'mkdirp-classic';
import path from 'path';
import Queue from 'queue-cb';
import chmod from './fs/chmod.ts';
import chown from './fs/chown.ts';
import utimes from './fs/utimes.ts';
import { objectAssign } from './shared/index.ts';
import stripPath from './stripPath.ts';
import validateAttributes from './validateAttributes.ts';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

import type { Mode } from 'fs';
import type { DirectoryAttributes, ExtractOptions, NoParamCallback } from './types.ts';

export default class DirectoryEntry {
  mode: Mode;
  mtime: number;
  path: string;
  basename: string;
  type: string;

  constructor(attributes: DirectoryAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.type === undefined) this.type = 'directory';
    if (this.basename === undefined) this.basename = path.basename(this.path);
  }

  create(dest: string, options: ExtractOptions | NoParamCallback, callback?: NoParamCallback): undefined | Promise<boolean> {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    if (typeof callback === 'function') {
      options = options || {};
      try {
        const normalizedPath = path.normalize(this.path);
        const fullPath = path.join(dest, stripPath(normalizedPath, options as ExtractOptions));

        // do not check for the existence of the directory but allow out-of-order calling
        const queue = new Queue(1);
        queue.defer(mkdirp.bind(null, fullPath));
        queue.defer(chmod.bind(null, fullPath, this, options));
        queue.defer(chown.bind(null, fullPath, this, options));
        queue.defer(utimes.bind(null, fullPath, this, options));
        queue.await(callback);
        return;
      } catch (err) {
        callback(err);
        return;
      }
    }

    return new Promise((resolve, reject) => {
      this.create(dest, options, (err?: Error, done?: boolean) => (err ? reject(err) : resolve(done)));
    });
  }

  destroy() {}
}
