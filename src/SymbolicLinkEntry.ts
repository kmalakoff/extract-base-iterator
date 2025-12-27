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
import stripPath from './shared/stripPath.ts';
import validateAttributes from './validateAttributes.ts';
import waitForAccess from './waitForAccess.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

import type { Mode } from 'fs';
import type { ExtractOptions, LinkAttributes, NoParamCallback } from './types.ts';

export default class SymbolicLinkEntry {
  mode: Mode;
  mtime: number;
  path: string;
  linkpath: string;
  basename: string;
  type: string;

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
            rm(fullPath, (err) => {
              err && err.code !== 'ENOENT' ? callback(err) : callback();
            });
          });
        }
        queue.defer(mkdirp.bind(null, path.dirname(fullPath)));
        if (isWindows) queue.defer(symlinkWin32.bind(null, linkFullPath, normalizedLinkpath, fullPath));
        else queue.defer(fs.symlink.bind(fs, normalizedLinkpath, fullPath));
        queue.defer(waitForAccess.bind(null, fullPath, true)); // noFollow=true for symlinks
        queue.defer(chmod.bind(null, fullPath, this, options));
        queue.defer(chown.bind(null, fullPath, this, options));
        queue.defer(lutimes.bind(null, fullPath, this, options));
        queue.await(callback);
      } catch (err) {
        callback(err);
      }
      return;
    }

    return new Promise((resolve, reject) => this.create(dest, options, (err?: Error, done?: boolean) => (err ? reject(err) : resolve(done))));
  }

  destroy() {}
}
