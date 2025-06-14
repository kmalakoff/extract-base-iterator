import fs from 'fs';

import type { NoParamCallback } from './types.js';

export default function waitForAccess(fullPath: string, callback: NoParamCallback): undefined {
  fs.stat(fullPath, (err) => {
    if (err) return setImmediate(() => waitForAccess(fullPath, callback));
    callback();
  });
}
