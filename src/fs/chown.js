// adapted from https://github.com/mafintosh/tar-fs

const fs = require('graceful-fs');

const UID = process.getuid ? process.getuid() : -1;
const OWN = process.platform !== 'win32' && UID === 0;

module.exports = function chownFn(fullPath, entry, _options, callback) {
  const chown = entry.type === 'symlink' ? fs.lchown : fs.chown;
  if (!chown || !OWN || !entry.uid || !entry.gid) return callback();
  chown(fullPath, entry.uid, entry.gid, callback);
};
