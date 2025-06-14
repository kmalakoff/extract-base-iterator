// adapted from https://github.com/mafintosh/tar-fs

import fs from 'graceful-fs';

import type { NoParamCallback } from 'fs';
import type { Entry, ExtractOptions } from '../types.js';

export default function utimes(fullPath: string, entry: Entry, options: ExtractOptions, callback: NoParamCallback): undefined {
  const now = options.now || new Date();
  fs.utimes(fullPath, now, new Date(entry.mtime), callback);
}
