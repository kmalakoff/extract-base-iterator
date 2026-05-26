import fs from 'fs';
import { rm } from 'fs-remove-compat';
import isAbsolute from 'is-absolute';
import mkdirp from 'mkdirp-classic';
import path from 'path';
import Queue from 'queue-cb';
import chmod from './fs/chmod.ts';
import chown from './fs/chown.ts';
import lutimes from './fs/lutimes.ts';
import symlinkWin32 from './fs/symlinkWin32.ts';
import { objectAssign } from './shared/index.ts';
import safeJoinPath from './shared/safeJoinPath.ts';
import stripPath from './shared/stripPath.ts';
import validateAttributes from './validateAttributes.ts';
import waitForAccess from './waitForAccess.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE ?? '');

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

import type { Mode } from 'fs';
import type { ExtractOptions, LinkAttributes, NoParamCallback } from './types.ts';

export default class SymbolicLinkEntry {
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
    if (this.type === undefined) this.type = 'symlink';
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
        // Resolve the symlink target against the symlink's own directory and verify it
        // stays within dest. safeJoinPath throws ETRAVERSAL if it escapes.
        const targetAbs = path.resolve(path.dirname(fullPath), this.linkpath);
        safeJoinPath(dest, path.relative(dest, targetAbs));
        const normalizedLinkpath = path.relative(path.dirname(fullPath), targetAbs);
        const linkFullPath = targetAbs;

        const queue = new Queue(1);
        if (options.force) {
          queue.defer((callback) => {
            rm(fullPath, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        }
        queue.defer((cb) => mkdirp(path.dirname(fullPath), (err) => cb(err ?? undefined)));
        if (isWindows) queue.defer((cb) => symlinkWin32(linkFullPath, normalizedLinkpath, fullPath, (err) => cb(err ?? undefined)));
        else queue.defer((cb) => fs.symlink(normalizedLinkpath, fullPath, (err) => cb(err ?? undefined)));
        queue.defer((cb) => waitForAccess(fullPath, true, cb)); // noFollow=true for symlinks
        queue.defer((cb) => chmod(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
        queue.defer((cb) => chown(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
        queue.defer((cb) => lutimes(fullPath, this, options as ExtractOptions, (err) => cb(err ?? undefined)));
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
