// adapted from https://github.com/mafintosh/tar-fs

import type { NoParamCallback } from 'fs';
import fs from 'graceful-fs';
import type { AbstractEntry, ExtractOptions } from '../types.ts';

const UID = process.getuid ? process.getuid() : -1;
const OWN = process.platform !== 'win32' && UID === 0;

export default function chownFn(fullPath: string, entry: AbstractEntry, _options: ExtractOptions, callback: NoParamCallback) {
  const chown = entry.type === 'symlink' ? fs.lchown : fs.chown;
  if (!chown || !OWN || !entry.uid || !entry.gid) {
    callback(null);
    return;
  }
  chown(fullPath, entry.uid, entry.gid, callback);
}
