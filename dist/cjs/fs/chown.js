// adapted from https://github.com/mafintosh/tar-fs
"use strict";
var fs = require("graceful-fs");
var UID = process.getuid ? process.getuid() : -1;
var OWN = process.platform !== "win32" && UID === 0;
module.exports = function chownFn(fullPath, entry, _options, callback) {
    var chown = entry.type === "symlink" ? fs.lchown : fs.chown;
    if (!chown || !OWN || !entry.uid || !entry.gid) return callback();
    chown(fullPath, entry.uid, entry.gid, callback);
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}