// adapted from https://github.com/mafintosh/tar-fs
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return chmodFn;
    }
});
var _gracefulfs = /*#__PURE__*/ _interop_require_default(require("graceful-fs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var UMASK = process.umask ? process.umask() : null;
var DMODE = parseInt(755, 8);
var FMODE = parseInt(644, 8);
var SMODE = parseInt(755, 8);
var LMODE = parseInt(644, 8);
function chmodFn(fullPath, entry, _options, callback) {
    var chmod = entry.type === "symlink" ? _gracefulfs.default.lchmod : _gracefulfs.default.chmod;
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
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }