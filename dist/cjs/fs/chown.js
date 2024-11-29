// adapted from https://github.com/mafintosh/tar-fs
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return chownFn;
    }
});
var _gracefulfs = /*#__PURE__*/ _interop_require_default(require("graceful-fs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var UID = process.getuid ? process.getuid() : -1;
var OWN = process.platform !== 'win32' && UID === 0;
function chownFn(fullPath, entry, _options, callback) {
    var chown = entry.type === 'symlink' ? _gracefulfs.default.lchown : _gracefulfs.default.chown;
    if (!chown || !OWN || !entry.uid || !entry.gid) return callback();
    chown(fullPath, entry.uid, entry.gid, callback);
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }