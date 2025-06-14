// adapted from https://github.com/mafintosh/tar-fs

import fs from 'graceful-fs';

import type { NoParamCallback } from 'fs';
import type { AbstractEntry, ExtractOptions } from '../types.js';

const UMASK = process.umask ? process.umask() : null;
const DMODE = 0o755;
const FMODE = 0o644;
const SMODE = 0o755;
const LMODE = 0o644;

export default function chmodFn(fullPath: string, entry: AbstractEntry, _options: ExtractOptions, callback: NoParamCallback) {
  const chmod = entry.type === 'symlink' ? fs.lchmod : fs.chmod;
  if (!chmod || UMASK === null) {
    callback(null);
    return;
  }

  let mode = entry.mode;
  if (!mode) {
    switch (entry.type) {
      case 'directory':
        mode = DMODE;
        break;
      case 'file':
        mode = FMODE;
        break;
      case 'symlink':
        mode = SMODE;
        break;
      case 'link':
        mode = LMODE;
        break;
    }
  }
  chmod(fullPath, (mode as number) & ~UMASK, callback);
}
