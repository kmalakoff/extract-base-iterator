import fs from 'fs';
import { rm } from 'fs-remove-compat';
import isAbsolute from 'is-absolute';
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

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

import type { Mode } from 'fs';
import type { ExtractOptions, LinkAttributes, NoParamCallback } from './types.ts';

export default class LinkEntry {
  mode!: Mode;
  mtime!: number;
  path!: string;
  linkpath!: string;
  basename!: string;
  type!: string;

  constructor(attributes: LinkAttributes) {
    validateAttributes(attributes, MANDATORY_ATTRIBUTES);
    objectAssign(this, attributes);
    if (this.basename === undefined) this.basename = path.basename(this.path);
    if (this.type === undefined) this.type = 'link';
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
        if (isAbsolute(this.linkpath)) {
          const err = new Error(`Absolute linkpath rejected: '${this.linkpath}'`) as NodeJS.ErrnoException;
          err.code = 'ETRAVERSAL';
          throw err;
        }
        const normalizedLinkpath = path.normalize(this.linkpath);
        const linkFullPath = safeJoinPath(dest, stripPath(normalizedLinkpath, options));

        const queue = new Queue(1);
        if (options.force) {
          queue.defer((callback) => {
            rm(fullPath, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        }
        queue.defer((cb) => mkdirp(path.dirname(fullPath), (err) => cb(err ?? undefined)));
        queue.defer((cb) => waitForAccess(linkFullPath, cb)); // ensure target file is accessible before linking
        queue.defer((cb) => fs.link(linkFullPath, fullPath, (err) => cb(err ?? undefined)));
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
