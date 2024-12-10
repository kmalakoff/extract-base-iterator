"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return lstatReal;
    }
});
var _gracefulfs = /*#__PURE__*/ _interop_require_default(require("graceful-fs"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function lstatReal(path, callback) {
    _gracefulfs.default.realpath(path, function realpathCallback(err, realpath) {
        err ? callback(err) : _gracefulfs.default.lstat(realpath, callback);
    });
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }