import mkdirp from 'mkdirp-classic';
import path from 'path';
import Queue from 'queue-cb';
import chmod from './fs/chmod.ts';
import chown from './fs/chown.ts';
import utimes from './fs/utimes.ts';
import { objectAssign } from './shared/index.ts';
import safeJoinPath from './shared/safeJoinPath.ts';
import stripPath from './shared/stripPath.ts';
import validateAttributes from './validateAttributes.ts';
import waitForAccess from './waitForAccess.ts';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

import type { Mode } from 'fs';
import type { DirectoryAttributes, ExtractOptions, NoParamCallback } from './types.ts';

export default class DirectoryEntry {
  mode!: Mode;
  mtime!: number;
  path!: string;
  basename!: string;
  type!: string;

  constructor(attributes: DirectoryAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.type === undefined) this.type = 'directory';
    if (this.basename === undefined) this.basename = path.basename(this.path);
  }

  create(dest: string, callback: NoParamCallback): void;
  create(dest: string, options: ExtractOptions, callback: NoParamCallback): void;
  create(dest: string, options?: ExtractOptions): Promise<boolean>;
  create(dest: string, options?: ExtractOptions | NoParamCallback, callback?: NoParamCallback): void | Promise<boolean> {
    callback = typeof options === 'function' ? options : callback;
    options = typeof options === 'function' ? {} : ((options || {}) as ExtractOptions);

    if (typeof callback === 'function') {
      try {
        const normalizedPath = path.normalize(this.path);
        const fullPath = safeJoinPath(dest, stripPath(normalizedPath, options));

        // do not check for the existence of the directory but allow out-of-order calling
        const queue = new Queue(1);
        queue.defer((cb) => mkdirp(fullPath, (err) => cb(err ?? undefined)));
        queue.defer((cb) => waitForAccess(fullPath, cb));
        queue.defer((cb) => chmod(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
        queue.defer((cb) => chown(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
        queue.defer((cb) => utimes(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
        queue.await(callback);
      } catch (err) {
        callback(err as Error);
      }
      return;
    }

    return new Promise((resolve, reject) => this.create(dest, options as ExtractOptions, (err?: Error) => (err ? reject(err) : resolve(true))));
  }

  destroy() {}
}
