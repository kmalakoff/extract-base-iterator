import type { NoParamCallback } from 'fs';
import fs from 'graceful-fs';
import lstatReal from './lstatReal.ts';

export default function symlinkWin32(linkFullPath: string, linkpath: string, fullPath: string, callback: NoParamCallback) {
  lstatReal(linkFullPath, (err, targetStat) => {
    if (err || !targetStat) return callback(err || new Error(`Symlink path does not exist${linkFullPath}`));
    const type = targetStat.isDirectory() ? 'dir' : 'file';
    fs.symlink(linkpath, fullPath, type, callback);
  });
}
