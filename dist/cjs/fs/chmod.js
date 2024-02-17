// adapted from https://github.com/mafintosh/tar-fs
"use strict";
var fs = require("graceful-fs");
var UMASK = process.umask ? process.umask() : null;
var DMODE = parseInt(755, 8);
var FMODE = parseInt(644, 8);
var SMODE = parseInt(755, 8);
var LMODE = parseInt(644, 8);
module.exports = function chmodFn(fullPath, entry, _options, callback) {
    var chmod = entry.type === "symlink" ? fs.lchmod : fs.chmod;
    if (!chmod || UMASK === null) return callback();
    var mode = entry.mode;
    if (!mode) {
        switch(entry.type){
            case "directory":
                mode = DMODE;
                break;
            case "file":
                mode = FMODE;
                break;
            case "symlink":
                mode = SMODE;
                break;
            case "link":
                mode = LMODE;
                break;
        }
    }
    chmod(fullPath, mode & ~UMASK, callback);
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}