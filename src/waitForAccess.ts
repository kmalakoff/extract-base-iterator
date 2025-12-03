import fs from 'fs';

import { setImmediateFn } from './shared/index.ts';
import type { NoParamCallback } from './types.ts';

export default function waitForAccess(fullPath: string, callback: NoParamCallback): undefined {
  fs.stat(fullPath, (err) => {
    if (err) return setImmediateFn(() => waitForAccess(fullPath, callback));
    callback();
  });
}
