import fs from 'fs';
import { rm } from 'fs-remove-compat';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import Queue from 'queue-cb';
import chmod from './fs/chmod.ts';
import chown from './fs/chown.ts';
import utimes from './fs/utimes.ts';
import { objectAssign } from './shared/index.ts';
import stripPath from './stripPath.ts';
import validateAttributes from './validateAttributes.ts';
import waitForAccess from './waitForAccess.ts';

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path'];

import type { Mode } from 'fs';
import type { ExtractOptions, FileAttributes, NoParamCallback, WriteFileFn } from './types.ts';

interface AbstractFileEntry {
  _writeFile: WriteFileFn;
}

export default class FileEntry {
  mode: Mode;
  mtime: number;
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

  create(dest: string, callback: NoParamCallback): void;
  create(dest: string, options: ExtractOptions, callback: NoParamCallback): void;
  create(dest: string, options?: ExtractOptions): Promise<boolean>;
  create(dest: string, options?: ExtractOptions | NoParamCallback, callback?: NoParamCallback): void | Promise<boolean> {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    if (typeof callback === 'function') {
      options = options || {};
      try {
        const normalizedPath = path.normalize(this.path);
        const fullPath = path.join(dest, stripPath(normalizedPath, options as ExtractOptions));

        const queue = new Queue(1);
        if ((options as ExtractOptions).force) {
          queue.defer((callback) => {
            rm(fullPath, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        } else {
          // Check if file exists - throw EEXIST if it does
          queue.defer((callback) => {
            fs.stat(fullPath, (err) => {
              if (!err) {
                const existsErr = new Error(`EEXIST: file already exists, open '${fullPath}'`) as NodeJS.ErrnoException;
                existsErr.code = 'EEXIST';
                existsErr.path = fullPath;
                return callback(existsErr);
              }
              // ENOENT means file doesn't exist - that's what we want
              if (err.code === 'ENOENT') return callback();
              // Other errors should be reported
              callback(err);
            });
          });
        }
        queue.defer(mkdirp.bind(null, path.dirname(fullPath)));
        queue.defer((this as unknown as AbstractFileEntry)._writeFile.bind(this, fullPath, options));
        queue.defer(waitForAccess.bind(null, fullPath));
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
      this.create(dest, options as ExtractOptions, (err?: Error, done?: boolean) => (err ? reject(err) : resolve(done)));
    });
  }

  destroy() {}
}
