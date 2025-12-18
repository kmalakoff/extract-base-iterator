// adapted from https://github.com/mafintosh/tar-fs

import type { NoParamCallback } from 'fs';
import fs from 'graceful-fs';
import type { AbstractEntry, ExtractOptions } from '../types.ts';

export default function utimes(fullPath: string, entry: AbstractEntry, options: ExtractOptions, callback: NoParamCallback): void {
  const now = options.now || new Date();
  fs.utimes(fullPath, now, new Date(entry.mtime), callback);
}
