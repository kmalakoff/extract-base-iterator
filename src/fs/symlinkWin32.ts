import fs, { type NoParamCallback } from 'fs';
import lstatReal from './lstatReal.ts';

export default function symlinkWin32(linkFullPath: string, linkpath: string, fullPath: string, callback: NoParamCallback) {
  lstatReal(linkFullPath, (err, targetStat) => {
    // If target doesn't exist, default to 'file' type (Windows requires a type for symlinks)
    const type = !err && targetStat?.isDirectory() ? 'dir' : 'file';
    fs.symlink(linkpath, fullPath, type, callback);
  });
}
