import fs from 'graceful-fs';

import type { NoParamCallback } from './types.ts';

// Backward compatible: waitForAccess(path, callback) or waitForAccess(path, noFollow, callback)
export default function waitForAccess(fullPath: string, noFollow: boolean | NoParamCallback, callback?: NoParamCallback | number) {
  callback = typeof noFollow === 'function' ? noFollow : callback;
  noFollow = typeof noFollow === 'function' ? false : (noFollow as boolean);

  // Exponential backoff: 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560ms
  // Total max wait: ~5 seconds
  function waitSymlink(attempts, cb) {
    fs.lstat(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT' && attempts < 10) {
          const delay = Math.min(5 * 2 ** attempts, 2560);
          return setTimeout(() => waitSymlink(attempts + 1, cb), delay);
        }
        return cb(err);
      }
      cb();
    });
  }
  function waitOpen(attempts, cb) {
    fs.open(fullPath, 'r', (err, fd) => {
      if (err) {
        if (err.code === 'ENOENT' && attempts < 10) {
          const delay = Math.min(5 * 2 ** attempts, 2560);
          return setTimeout(() => waitOpen(attempts + 1, cb), delay);
        }
        return cb(err);
      }
      fs.close(fd, () => cb());
    });
  }

  // Windows: NTFS metadata may not be committed yet, verify accessibility
  // Node 0.10: the write stream's finish/close events may fire before the file is fully flushed to disk
  // For symlinks (noFollow=true), use lstat to check the link itself exists
  // For files/dirs/hardlinks, use open to verify the file is accessible
  noFollow ? waitSymlink(0, callback) : waitOpen(0, callback);
}
