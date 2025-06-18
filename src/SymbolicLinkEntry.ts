import fs from 'graceful-fs';
import isAbsolute from 'is-absolute';
import mkdirp from 'mkdirp-classic';
import objectAssign from 'object-assign';
import path from 'path';
import Queue from 'queue-cb';
import rimraf2 from 'rimraf2';

import chmod from './fs/chmod.js';
import chown from './fs/chown.js';
import symlinkWin32 from './fs/symlinkWin32.js';
import utimes from './fs/utimes.js';
import stripPath from './stripPath.js';
import validateAttributes from './validateAttributes.js';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

const MANDATORY_ATTRIBUTES = ['mode', 'mtime', 'path', 'linkpath'];

import type { Mode } from 'fs';
import type { ExtractOptions, LinkAttributes, NoParamCallback } from './types.js';

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
        let normalizedLinkpath = path.normalize(this.linkpath);
        let linkFullPath = path.join(dest, stripPath(normalizedLinkpath, options as ExtractOptions));
        if (!isAbsolute(normalizedLinkpath)) {
          const linkRelativePath = path.join(path.dirname(normalizedPath), this.linkpath);
          linkFullPath = path.join(dest, stripPath(linkRelativePath, options as ExtractOptions));
          normalizedLinkpath = path.relative(path.dirname(fullPath), linkFullPath);
        }

        const queue = new Queue(1);
        if ((options as ExtractOptions).force) {
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
