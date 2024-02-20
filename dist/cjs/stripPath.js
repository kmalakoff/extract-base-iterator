"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return stripPath;
    }
});
var _path = /*#__PURE__*/ _interop_require_default(require("path"));
var _lodashcompact = /*#__PURE__*/ _interop_require_default(require("lodash.compact"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function stripPath(relativePath, options) {
    var strip = options.strip || 0;
    if (!strip) return relativePath;
    var parts = (0, _lodashcompact.default)(relativePath.split(_path.default.sep));
    if (parts.length < strip) throw new Error("You cannot strip more levels than there are directories. Strip: ".concat(strip, ". Path: ").concat(relativePath));
    return parts.slice(strip).join(_path.default.sep);
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }