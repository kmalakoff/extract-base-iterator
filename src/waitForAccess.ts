import fs from 'fs';

import type { NoParamCallback } from './types.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

// Backward compatible: waitForAccess(path, callback) or waitForAccess(path, noFollow, callback)
export default function waitForAccess(fullPath: string, noFollowOrCallback: boolean | NoParamCallback, callbackOrAttempts?: NoParamCallback | number, attempts = 0) {
  // Parse arguments for backward compatibility
  let noFollow: boolean;
  let callback: NoParamCallback;
  if (typeof noFollowOrCallback === 'function') {
    // Old signature: waitForAccess(path, callback, attempts?)
    noFollow = false;
    callback = noFollowOrCallback;
    attempts = (callbackOrAttempts as number) || 0;
  } else {
    // New signature: waitForAccess(path, noFollow, callback, attempts?)
    noFollow = noFollowOrCallback;
    callback = callbackOrAttempts as NoParamCallback;
  }

  // POSIX: finish event is reliable after decompression stream fixes
  // Avoid Zalgo: ensure callback is always async for consistent API
  if (!isWindows) return process.nextTick(callback);

  // Windows: NTFS metadata may not be committed yet, verify accessibility
  // For symlinks (noFollow=true), use lstat to check the link itself exists
  // For files/dirs/hardlinks, use open to verify the file is accessible
  if (noFollow) {
    fs.lstat(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT' && attempts < 10) {
          const delay = Math.min(5 * 2 ** attempts, 2560);
          return setTimeout(() => waitForAccess(fullPath, noFollow, callback, attempts + 1), delay);
        }
        return callback(err);
      }
      callback();
    });
  } else {
    fs.open(fullPath, 'r', (err, fd) => {
      if (err) {
        if (err.code === 'ENOENT' && attempts < 10) {
          // Exponential backoff: 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560ms
          // Total max wait: ~5 seconds
          const delay = Math.min(5 * 2 ** attempts, 2560);
          return setTimeout(() => waitForAccess(fullPath, noFollow, callback, attempts + 1), delay);
        }
        return callback(err);
      }
      fs.close(fd, () => callback());
    });
  }
}
