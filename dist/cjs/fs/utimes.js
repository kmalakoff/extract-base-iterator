// adapted from https://github.com/mafintosh/tar-fs
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return utimes;
    }
});
var _gracefulfs = /*#__PURE__*/ _interop_require_default(require("graceful-fs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function utimes(fullPath, entry, options, callback) {
    var now = options.now || new Date();
    _gracefulfs.default.utimes(fullPath, now, new Date(entry.mtime), callback);
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { module.exports = exports.default; for (var key in exports) module.exports[key] = exports[key]; }