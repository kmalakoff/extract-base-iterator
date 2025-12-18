// lutimes - set times on symlinks without following them
// fs.lutimes was added in Node.js 14.5.0
// For older versions, we skip setting times on symlinks (no good alternative)

import type { NoParamCallback } from 'fs';
import fs from 'graceful-fs';
import type { AbstractEntry, ExtractOptions } from '../types.ts';

// biome-ignore lint/suspicious/noExplicitAny: fs.lutimes not in older @types/node
const HAS_LUTIMES = typeof (fs as any).lutimes === 'function';

export default function lutimes(fullPath: string, entry: AbstractEntry, options: ExtractOptions, callback: NoParamCallback): void {
  if (HAS_LUTIMES) {
    const now = options.now || new Date();
    // biome-ignore lint/suspicious/noExplicitAny: fs.lutimes not in older @types/node
    (fs as any).lutimes(fullPath, now, new Date(entry.mtime), callback);
  } else {
    // On older Node versions, skip setting times on symlinks
    // fs.utimes follows symlinks and will fail with ENOENT if target doesn't exist
    callback(null);
  }
}
