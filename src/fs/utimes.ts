// adapted from https://github.com/mafintosh/tar-fs

import fs from 'graceful-fs';

export default function utimes(fullPath, entry, options, callback) {
  const now = options.now || new Date();
  fs.utimes(fullPath, now, new Date(entry.mtime), callback);
}
