// adapted from https://github.com/mafintosh/tar-fs

const fs = require('graceful-fs');

module.exports = function utimes(fullPath, entry, options, callback) {
  const now = options.now || new Date();
  fs.utimes(fullPath, now, new Date(entry.mtime), callback);
};
